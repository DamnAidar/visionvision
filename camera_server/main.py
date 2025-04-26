import cv2
import socket
import time
import numpy as np
import os
import logging
import traceback

# Настройка логирования
log_level = os.environ.get('LOG_LEVEL', 'INFO')
numeric_level = getattr(logging, log_level.upper(), logging.INFO)
logging.basicConfig(level=numeric_level,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def get_analytics_host():
    """Получаем имя хоста analytics из переменной окружения или используем значение по умолчанию"""
    host = os.environ.get('ANALYTICS_HOST', 'analytics')
    logger.info(f"Используется хост аналитики: {host}")
    return host


def open_camera():
    """Функция для открытия камеры с несколькими попытками"""
    use_test_video = os.environ.get('USE_TEST_VIDEO', 'false').lower() == 'true'

    if use_test_video:
        video_path = "/app/test_video.mp4"
        logger.info(f"Используется тестовое видео: {video_path}")

        # Проверяем наличие файла
        if not os.path.exists(video_path):
            logger.error(f"Файл {video_path} не найден!")
            return None

        return cv2.VideoCapture(video_path)
    else:
        # Проверяем наличие переменной окружения CAMERA_URL
        camera_url = os.environ.get('CAMERA_URL')

        if camera_url:
            logger.info(f"Используется IP-камера по URL: {camera_url}")
            return cv2.VideoCapture(camera_url)

        # Пробуем разные ID камер (0, 1, 2, ...)
        for camera_id in range(3):  # Проверяем первые 3 камеры
            logger.info(f"Пытаемся открыть камеру с ID {camera_id}...")
            cap = cv2.VideoCapture(camera_id)
            if cap.isOpened():
                logger.info(f"Успешно открыта камера с ID {camera_id}")
                return cap

        # Если не удалось открыть камеру
        logger.error("Не удалось найти или открыть камеру!")
        return None


def main():
    logger.info("=== Инициализация камеры ===")

    # Открываем камеру
    cap = open_camera()

    if cap is None or not cap.isOpened():
        logger.error("Ошибка: не удалось открыть видеопоток.")
        return

    # Получаем информацию о видео
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    logger.info(f"Видео: {width}x{height}, {fps} FPS")

    # Создаем UDP сокет для отправки кадров
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    analytics_host = get_analytics_host()
    analytics_port = 5005
    frame_count = 0
    error_count = 0
    last_log_time = time.time()

    logger.info("Начало трансляции...")

    # Тест соединения перед началом
    try:
        test_message = b"CONNECTION_TEST"
        sock.sendto(test_message, (analytics_host, analytics_port))
        logger.info(f"Тестовое сообщение отправлено на {analytics_host}:{analytics_port}")
    except Exception as e:
        logger.error(f"Ошибка при тестировании соединения: {e}")

    use_test_video = os.environ.get('USE_TEST_VIDEO', 'false').lower() == 'true'

    while True:
        try:
            ret, frame = cap.read()

            if not ret:
                if use_test_video:
                    logger.info("Достигнут конец видео, перезапуск...")
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Перезапуск видео с начала
                else:
                    logger.warning("Потеряно соединение с камерой, пытаемся переподключиться...")
                    time.sleep(2)
                    cap = open_camera()
                    if cap is None or not cap.isOpened():
                        logger.error("Не удалось переподключиться к камере")
                        time.sleep(5)  # Ждем дольше перед следующей попыткой
                continue

            # Уменьшаем размер кадра для передачи по сети
            frame = cv2.resize(frame, (640, 480))

            # Кодируем кадр в JPEG для уменьшения размера
            encode_param = [cv2.IMWRITE_JPEG_QUALITY, 80]
            _, buffer = cv2.imencode('.jpg', frame, encode_param)

            # Логирование с периодичностью 5 секунд, чтобы не переполнять лог
            current_time = time.time()
            if current_time - last_log_time > 5:
                logger.info(f"Отправка кадра на {analytics_host}:{analytics_port}, размер: {len(buffer)} байт")
                last_log_time = current_time

            # Отправляем кадр на сервис аналитики
            try:
                sock.sendto(buffer, (analytics_host, analytics_port))
                error_count = 0  # Сбрасываем счетчик ошибок при успешной отправке
            except socket.gaierror:
                error_count += 1
                logger.error(f"Не удалось найти хост {analytics_host}")
                if error_count > 10:
                    logger.critical("Слишком много ошибок соединения, пробуем переподключиться")
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    error_count = 0
                time.sleep(1)  # Ждем немного перед следующей попыткой
            except Exception as e:
                logger.error(f"Ошибка отправки кадра: {e}")
                time.sleep(0.5)

            frame_count += 1
            if frame_count % 100 == 0:
                logger.info(f"Обработано {frame_count} кадров")

            # Небольшая задержка для контроля скорости передачи (20 кадров в секунду)
            time.sleep(0.05)

        except Exception as e:
            logger.error(f"Ошибка обработки кадра: {e}")
            logger.error(traceback.format_exc())
            time.sleep(1)
            continue

    cap.release()
    logger.info("Трансляция завершена.")


if __name__ == "__main__":
    main()