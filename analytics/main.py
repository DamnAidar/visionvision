# analytics/main.py
import os
import sys
import time
import cv2
import socket
import base64
import logging
import traceback
import numpy as np
import asyncio
import requests
import torch
from fastapi import FastAPI, WebSocket, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketDisconnect
import uvicorn
from threading import Thread, Lock
from pathlib import Path
from deep_sort_realtime.deepsort_tracker import DeepSort
from concurrent.futures import ThreadPoolExecutor
main_event_loop = None

# Определение пути к YOLOv5 в зависимости от среды выполнения
if os.path.exists('/app/yolov5'):
    sys.path.append('/app/yolov5')  # Для Docker
else:
    # Для локальной разработки предполагаем, что yolov5 находится рядом
    local_yolo_path = os.path.join(os.path.dirname(__file__), 'yolov5')
    if not os.path.exists(local_yolo_path):
         # Если не нашли рядом, пробуем искать относительно корня проекта (если структура другая)
         project_root_yolo = os.path.join(os.path.dirname(__file__), '..', 'yolov5')
         if os.path.exists(project_root_yolo):
              sys.path.append(project_root_yolo)
         else:
              # Если совсем не нашли, добавим текущую директорию, как было раньше
              sys.path.append(os.path.join(os.path.dirname(__file__), 'yolov5'))
    else:
         sys.path.append(local_yolo_path)


# Импорт из YOLOv5
try:
    from yolov5.models.common import DetectMultiBackend
    from yolov5.utils.general import non_max_suppression
    from yolov5.utils.augmentations import letterbox
except ImportError as e:
    logging.error(f"Ошибка импорта YOLOv5: {e}. Проверьте правильность пути в sys.path: {sys.path}")
    sys.exit(1)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Конфигурационные параметры ---
PROCESS_EVERY_N_FRAMES = 1  # Обрабатывать каждый кадр
MAX_CONNECTIONS = 10
WEBSOCKET_PORT = int(os.getenv("WEBSOCKET_PORT", "8080"))
UDP_PORT = int(os.getenv("UDP_PORT", "5005"))
API_URL = os.getenv("API_URL", "http://api:8000")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
IOU_THRESHOLD = float(os.getenv("IOU_THRESHOLD", "0.45"))
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "50")) # Качество для WebSocket
IMG_SIZE_W = int(os.getenv("IMG_SIZE_W", "320"))
IMG_SIZE_H = int(os.getenv("IMG_SIZE_H", "320"))
img_size = (IMG_SIZE_H, IMG_SIZE_W)

# Определение путей к моделям
if os.path.exists('/app'): # Внутри Docker
    model_path = os.getenv("MODEL_PATH", "/app/yolov5s.pt")
    # --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
    deep_sort_model_path = os.getenv("DEEPSORT_MODEL_PATH", "/app/deep_sort_weights/mars-small128.pb")
else: # Локально
    model_path = os.getenv("MODEL_PATH", "yolov5s.pt")
    # --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
    deep_sort_model_path = os.getenv("DEEPSORT_MODEL_PATH", "deep_sort_weights/mars-small128.pb")


# Проверка наличия файла YOLOv5
if not os.path.exists(model_path):
    logger.error(f"Файл модели YOLOv5 не найден: {model_path}")
    sys.exit(1)
logger.info(f"YOLOv5 model path: {model_path}")

# Проверка наличия файла DeepSort модели (.pb)
if not os.path.exists(deep_sort_model_path):
     logger.warning(f"Файл модели DeepSort (.pb) не найден: {deep_sort_model_path}. Трекер может не инициализироваться.")
     # Если файл обязателен, используйте sys.exit(1)
     # sys.exit(1)
else:
     logger.info(f"DeepSort model path: {deep_sort_model_path}")


# Определение устройства для вычислений
try:
    if torch.cuda.is_available():
        device = torch.device("cuda")
        logger.info(f"CUDA доступен. Используется GPU: {torch.cuda.get_device_name(0)}")
    else:
        device = torch.device("cpu")
        logger.info("CUDA недоступен. Используется CPU.")
except Exception as e:
    logger.warning(f"Ошибка при проверке CUDA: {e}. Используется CPU.")
    device = torch.device("cpu")


# Определение функции scale_boxes (версия, избегающая inplace)
def scale_boxes(img1_shape, boxes, img0_shape):
    """
    Масштабирование коробок (x1, y1, x2, y2) из img1_shape к img0_shape
    без использования операций inplace на входном тензоре 'boxes'.
    """
    boxes_copy = boxes.clone().detach()
    gain = min(img1_shape[0] / img0_shape[0], img1_shape[1] / img0_shape[1])
    pad_w = (img1_shape[1] - img0_shape[1] * gain) / 2
    pad_h = (img1_shape[0] - img0_shape[0] * gain) / 2
    boxes_copy[:, [0, 2]] -= pad_w
    boxes_copy[:, [1, 3]] -= pad_h
    boxes_copy[:, :4] /= gain
    boxes_copy[:, [0, 2]] = boxes_copy[:, [0, 2]].clamp(0, img0_shape[1])
    boxes_copy[:, [1, 3]] = boxes_copy[:, [1, 3]].clamp(0, img0_shape[0])
    return boxes_copy


# Инициализация FastAPI
app = FastAPI(title="Vision Analytics Service",
              description="Сервис обнаружения и отслеживания объектов",
              version="1.0.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

main_event_loop = None  # Глобальный event loop

@app.on_event("startup")
async def on_startup():
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()


# Глобальные переменные
latest_processed_frame = None
connected_websockets = set()
frame_lock = Lock()
executor = ThreadPoolExecutor(max_workers=os.cpu_count() or 4)

# Загрузка модели YOLOv5
try:
    logger.info(f"Загрузка модели YOLOv5 из {model_path} на устройство {device}")
    model = DetectMultiBackend(model_path, device=device, dnn=False, fp16= (device.type != 'cpu'))
    model.eval()
    stride = int(model.stride) if hasattr(model, 'stride') else 32
    logger.info(f"Модель YOLOv5 успешно загружена. Stride: {stride}, Image Size: {img_size}")
except Exception as e:
    logger.error(f"Ошибка загрузки модели YOLOv5: {e}", exc_info=True)
    sys.exit(1)

# Инициализация DeepSort
try:
    # --- ИЗМЕНЕНИЕ ЗДЕСЬ: Параметры для mars-small128.pb ---
  #  logger.info(f"Инициализация DeepSort с TensorFlow моделью '{deep_sort_model_path}'")
    from deep_sort_realtime.deepsort_tracker import DeepSort

    tracker = DeepSort(
        max_iou_distance=0.7,
        max_age=30,
        n_init=3,
        nms_max_overlap=1.0,
        nn_budget=None,
        override_track_class=None,
        embedder="mobilenet",
        half=(device.type != 'cpu'),
        bgr=True,
    )

    logger.info("DeepSort успешно инициализирован")
except FileNotFoundError:
    logger.error(f"Ошибка инициализации DeepSort: Файл модели не найден по пути {deep_sort_model_path}")
    sys.exit(1)
except Exception as e:
    logger.error(f"Ошибка инициализации DeepSort: {e}", exc_info=True)
    sys.exit(1)


# Статистика
class Stats:
    def __init__(self):
        self.processed_frames_total = 0
        self.processed_frames_interval = 0
        self.detected_objects = 0
        self.tracked_objects = 0
        self.start_time = time.time()
        self.last_fps_update_time = self.start_time
        self.fps = 0.0

    def update_frame_count(self):
        self.processed_frames_total += 1
        self.processed_frames_interval += 1
        current_time = time.time()
        elapsed_interval = current_time - self.last_fps_update_time
        if elapsed_interval >= 5.0:
            self.fps = self.processed_frames_interval / elapsed_interval
            logger.info(f"Текущий FPS обработки: {self.fps:.2f}")
            self.last_fps_update_time = current_time
            self.processed_frames_interval = 0

    def update_object_count(self, detected_count, tracked_count):
        self.detected_objects = detected_count
        self.tracked_objects = tracked_count

stats = Stats()

# --- Функция send_alert_to_api (без изменений) ---
async def send_alert_to_api_async(track_id, bbox, confidence=1.0, class_id=0, frame_shape=None):
    try:
        if frame_shape:
            h, w = frame_shape[:2]
            norm_bbox = [
                max(0.0, bbox[0] / w), max(0.0, bbox[1] / h),
                min(1.0, bbox[2] / w), min(1.0, bbox[3] / h)
            ]
        else:
            norm_bbox = bbox.tolist() if hasattr(bbox, 'tolist') else list(bbox)

        data = {
            "timestamp": time.time(), "track_id": str(track_id),
            "bbox_normalized": norm_bbox, "confidence": float(confidence),
            "class_id": int(class_id), "source_info": "camera_udp_0"
        }

        def send_post():
            with requests.Session() as session:
                return session.post(f"{API_URL}/alerts", json=data, timeout=2.0)

        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, send_post)

        if response.status_code in [200, 201]:
            logger.debug(f"Оповещение успешно отправлено для объекта {track_id}")
        else:
            logger.warning(f"Ошибка при отправке оповещения API (статус {response.status_code}): {response.text}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка соединения с API при отправке оповещения: {e}")
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при отправке оповещения: {e}", exc_info=True)





# --- Функция preprocess (без изменений) ---
def preprocess(img, target_size, model_stride):
    img0 = img.copy()
    img = letterbox(img, target_size, stride=model_stride, auto=True)[0]
    img = img.transpose((2, 0, 1))[::-1]
    img = np.ascontiguousarray(img)
    img = torch.from_numpy(img).to(device)
    img = img.half() if device.type != 'cpu' else img.float()
    img /= 255.0
    if len(img.shape) == 3:
        img = img[None]
    return img, img0


# --- Функция process_frame (без изменений в логике, только вызов send_alert_to_api) ---
def process_frame(frame_data):
    global latest_processed_frame
    frame_receive_time = time.time()

    if frame_data is None:
        logger.warning("Получен пустой кадр (None) для обработки.")
        return None
    try:
        if isinstance(frame_data, bytes):
            np_data = np.frombuffer(frame_data, dtype=np.uint8)
            frame = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
            if frame is None:
                logger.error("Не удалось декодировать кадр из байтов.")
                return None
        elif isinstance(frame_data, np.ndarray):
            frame = frame_data
        else:
            logger.error(f"Неподдерживаемый тип кадра: {type(frame_data)}")
            return None

        img_tensor, img0 = preprocess(frame, img_size, stride)
        preprocess_end_time = time.time()

        with torch.no_grad():
            pred = model(img_tensor, augment=False, visualize=False)
        detect_end_time = time.time()

        pred_boxes = non_max_suppression(pred, CONFIDENCE_THRESHOLD, IOU_THRESHOLD, classes=None, agnostic=False, max_det=1000)[0]
        nms_end_time = time.time()

        detections_for_tracker = []
        detected_count = 0
        if pred_boxes is not None and len(pred_boxes):
            scaled_boxes_xyxy = scale_boxes(img_tensor.shape[2:], pred_boxes[:, :4].clone(), img0.shape[:2])
            for i, det in enumerate(pred_boxes):
                xyxy = scaled_boxes_xyxy[i].cpu().numpy()
                conf = det[4].item()
                cls_id = int(det[5].item())
                if cls_id == 0: # Filter "person" class
                    detected_count += 1
                    x1, y1, x2, y2 = xyxy
                    w, h = x2 - x1, y2 - y1
                    bbox_ltwh = [x1, y1, w, h]
                    detections_for_tracker.append((bbox_ltwh, conf, cls_id))
        scale_end_time = time.time()

        processed_frame_vis = img0.copy()

        if detections_for_tracker:
            tracks = tracker.update_tracks(detections_for_tracker, frame=img0)
        else:
            tracks = tracker.update_tracks([], frame=img0)
        track_end_time = time.time()

        tracked_count = 0
        for track in tracks:
            if not track.is_confirmed() or track.time_since_update > 1:
                continue
            tracked_count += 1
            track_id = track.track_id
            ltrb = track.to_ltrb()
            class_id = track.get_det_class()
            confidence = track.get_det_conf()

            x1, y1, x2, y2 = map(int, ltrb)
            cv2.rectangle(processed_frame_vis, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(processed_frame_vis, f"ID:{track_id} C:{confidence:.2f}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

            if track.time_since_update == 0:
                asyncio.run_coroutine_threadsafe(
                    send_alert_to_api_async(track_id, ltrb, confidence, class_id, frame_shape=img0.shape),
                    main_event_loop
                )

        vis_end_time = time.time()

        stats.update_object_count(detected_count, tracked_count)

        cv2.putText(processed_frame_vis, f"FPS: {stats.fps:.1f}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        cv2.putText(processed_frame_vis, f"Detect:{detected_count} Track:{tracked_count}", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        with frame_lock:
            latest_processed_frame = processed_frame_vis
        update_glob_end_time = time.time()

        logger.debug(
            f"Frame timing: Preproc: {(preprocess_end_time - frame_receive_time)*1000:.1f}ms, "
            f"Detect: {(detect_end_time - preprocess_end_time)*1000:.1f}ms, NMS: {(nms_end_time - detect_end_time)*1000:.1f}ms, "
            f"Scale: {(scale_end_time - nms_end_time)*1000:.1f}ms, Track: {(track_end_time - scale_end_time)*1000:.1f}ms, "
            f"Vis: {(vis_end_time - track_end_time)*1000:.1f}ms, UpdateGlob: {(update_glob_end_time - vis_end_time)*1000:.1f}ms, "
            f"TOTAL: {(update_glob_end_time - frame_receive_time)*1000:.1f}ms" )

        return processed_frame_vis

    except Exception as e:
        logger.error(f"Критическая ошибка обработки кадра: {e}", exc_info=True)
        with frame_lock:
             latest_processed_frame = frame if 'frame' in locals() else None
        return None


# --- Endpoint /health (без изменений) ---
@app.get("/health")
async def health_check():
    uptime = time.time() - stats.start_time
    return {
        "status": "ok", "uptime_seconds": round(uptime, 2),
        "processing_fps": round(stats.fps, 2), "last_detected_objects": stats.detected_objects,
        "last_tracked_objects": stats.tracked_objects, "total_frames_processed": stats.processed_frames_total,
        "compute_device": str(device), "yolo_model": model_path,
        "deepsort_model": deep_sort_model_path, "active_ws_connections": len(connected_websockets)
    }


# --- WebSocket /ws (без изменений) ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global connected_websockets
    if len(connected_websockets) >= MAX_CONNECTIONS:
        logger.warning(f"Отказ в WebSocket подключении: превышен лимит ({MAX_CONNECTIONS})")
        await websocket.close(code=1008, reason="Max connections reached")
        return

    await websocket.accept()
    connected_websockets.add(websocket)
    client_host = websocket.client.host
    client_port = websocket.client.port
    logger.info(f"WebSocket клиент подключен: {client_host}:{client_port}. Активных: {len(connected_websockets)}")

    try:
        while True:
            with frame_lock:
                frame_to_send = latest_processed_frame
            if frame_to_send is not None:
                try:
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
                    result, encoded_img = cv2.imencode('.jpg', frame_to_send, encode_param)
                    if result:
                        base64_img = base64.b64encode(encoded_img).decode('utf-8')
                        await websocket.send_text(f"data:image/jpeg;base64,{base64_img}")
                    else:
                        logger.warning("Ошибка кодирования кадра в JPEG для WebSocket")
                except WebSocketDisconnect:
                    logger.info(f"WebSocket клиент {client_host}:{client_port} отключился во время отправки.")
                    break
                except Exception as e:
                    logger.error(f"Ошибка отправки кадра по WebSocket: {e}")
            await asyncio.sleep(0.020) # ~50 FPS cap for sending
    except WebSocketDisconnect:
        logger.info(f"WebSocket клиент {client_host}:{client_port} штатно отключился.")
    except Exception as e:
        logger.error(f"Ошибка WebSocket соединения с {client_host}:{client_port}: {e}", exc_info=True)
    finally:
        connected_websockets.discard(websocket)
        logger.info(f"WebSocket клиент {client_host}:{client_port} удален. Активных: {len(connected_websockets)}")


# --- Функция start_websocket_server (без изменений) ---
def start_websocket_server():
    logger.info(f"Запуск Uvicorn на {WEBSOCKET_PORT}...")
    try:
        uvicorn.run(app, host="0.0.0.0", port=WEBSOCKET_PORT, log_level="info")
    except Exception as e:
        logger.critical(f"Не удалось запустить Uvicorn сервер: {e}", exc_info=True)
        sys.exit(1)


# --- Функция udp_receiver_loop (без изменений) ---
def udp_receiver_loop():
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 262144)
        sock.bind(("0.0.0.0", UDP_PORT))
        logger.info(f"UDP сервер слушает порт {UDP_PORT} для получения кадров...")
    except Exception as e:
        logger.critical(f"Не удалось открыть UDP сокет на порту {UDP_PORT}: {e}", exc_info=True)
        sys.exit(1)

    frame_counter = 0
    last_log_time = time.time()
    futures = []
    MAX_QUEUE_SIZE = 10

    while True:
        try:
            data, addr = sock.recvfrom(65535)
            receive_time = time.time()
            logger.debug(f"Получен UDP пакет от {addr}, размер: {len(data)} байт")
            if not data:
                logger.warning(f"Получен пустой UDP пакет от {addr}")
                continue

            frame_counter += 1

            if len(futures) >= MAX_QUEUE_SIZE:
                logger.warning(f"Очередь обработки кадров достигла лимита ({MAX_QUEUE_SIZE}). Пропускаем кадр.")
                futures = [f for f in futures if not f.done()]
                continue

            future = executor.submit(process_frame, data[:])
            futures.append(future)

            if frame_counter % 10 == 0:
                completed_futures = []
                for f in futures:
                    if f.done():
                        try: f.result()
                        except Exception as exc: logger.error(f'Задача обработки кадра завершилась с ошибкой: {exc}', exc_info=True)
                        completed_futures.append(f)
                futures = [f for f in futures if f not in completed_futures]
                logger.debug(f"Очистка завершенных задач. В очереди: {len(futures)}")

            stats.update_frame_count()

            current_time = time.time()
            if current_time - last_log_time > 60:
                logger.info(f"Получено ~{frame_counter} кадров за последнюю минуту. Активных WebSocket: {len(connected_websockets)}. Очередь обработки: {len(futures)}.")
                frame_counter = 0
                last_log_time = current_time

        except socket.timeout:
            logger.warning("Таймаут приема UDP пакета.")
            continue
        except Exception as e:
            logger.error(f"Ошибка в цикле приема UDP: {e}", exc_info=True)
            time.sleep(0.1)

    logger.info("Закрытие UDP сокета.")
    sock.close()


# --- Точка входа __main__ (без изменений) ---
if __name__ == "__main__":
    logger.info("Запуск сервиса Vision Analytics...")
    ws_thread = Thread(target=start_websocket_server, daemon=True)
    ws_thread.start()
    logger.info(f"HTTP/WebSocket сервер запущен в фоновом потоке (порт {WEBSOCKET_PORT})")
    udp_receiver_loop()
    ws_thread.join()
    logger.info("Сервис Vision Analytics остановлен.")