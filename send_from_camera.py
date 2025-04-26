# send_from_camera.py
import cv2
import socket
import time
import sys

# --- Настройки ---
# UDP_IP = "localhost" # Стандартный вариант, если Docker на той же машине (Linux/Mac)
# UDP_IP = "host.docker.internal" # Попробуйте этот вариант для Docker Desktop (Windows/Mac)
UDP_IP = "localhost" # ИЛИ УКАЖИТЕ ЯВНЫЙ IP АДРЕС ХОСТА, ЕСЛИ НЕ РАБОТАЕТ
UDP_PORT = 5005
# Интервал отправки в секундах. 0.05 = ~20 FPS, 0.033 = ~30 FPS. 0 = максимально быстро.
SEND_INTERVAL = 0.10
# Качество сжатия JPEG (0-100). Меньше = хуже качество, меньше трафик.
JPEG_QUALITY = 75
# Индекс камеры. 0 - обычно встроенная, 1, 2... - внешние.
CAMERA_INDEX = 0
# --- Конец настроек ---


def main():
    # Инициализация камеры
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print(f"[ERROR] Не удалось открыть камеру с индексом {CAMERA_INDEX}")
        sys.exit(1)
    else:
        # Попробуем установить разрешение (не все камеры поддерживают)
        # cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        # cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        fps = cap.get(cv2.CAP_PROP_FPS) # Может возвращать 0 или неточное значение
        print(f"[INFO] Камера {CAMERA_INDEX} открыта ({int(width)}x{int(height)} @ {fps:.1f} FPS)")


    # Инициализация UDP сокета
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        print(f"[INFO] Отправка кадров на UDP {UDP_IP}:{UDP_PORT}")
        print(f"[INFO] Интервал отправки: {SEND_INTERVAL} сек (~{1/SEND_INTERVAL if SEND_INTERVAL > 0 else 'max'} FPS)")
        print(f"[INFO] Качество JPEG: {JPEG_QUALITY}")
        print("[INFO] Нажмите Ctrl+C для завершения.")
    except socket.error as e:
        print(f"[ERROR] Ошибка создания UDP сокета: {e}")
        cap.release()
        sys.exit(1)

    frame_count = 0
    start_time = time.time()

    try:
        while True:
            # Захват кадра с камеры
            ret, frame = cap.read()
            if not ret or frame is None:
                print("[WARNING] Не удалось получить кадр с камеры, пропуск...")
                time.sleep(0.1) # Пауза перед следующей попыткой
                continue

            # Сжатие кадра в JPEG
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
            result, buffer = cv2.imencode('.jpg', frame, encode_param)

            if not result:
                print("[WARNING] Не удалось сжать кадр в JPEG, пропуск...")
                continue

            # Отправка данных по UDP
            try:
                # Проверяем размер буфера (UDP имеет ограничение ~64KB, но лучше меньше)
                if len(buffer) > 60000:
                     print(f"[WARNING] Размер кадра ({len(buffer)} байт) слишком большой для UDP. Попробуйте снизить качество JPEG или разрешение камеры.")
                     # Можно пропустить отправку или попытаться отправить
                     # continue
                sock.sendto(buffer, (UDP_IP, UDP_PORT))
                frame_count += 1
                # print(f"Sent frame {frame_count}, size: {len(buffer)} bytes") # Для отладки
            except socket.error as e:
                print(f"[ERROR] Ошибка отправки UDP пакета: {e}")
                # Можно добавить логику переподключения или просто продолжить/выйти
                time.sleep(1)

            # Задержка между кадрами
            if SEND_INTERVAL > 0:
                time.sleep(SEND_INTERVAL)

    except KeyboardInterrupt:
        print("\n[INFO] Получен сигнал завершения (Ctrl+C).")
    except Exception as e:
        print(f"[ERROR] Непредвиденная ошибка: {e}")
    finally:
        # Освобождение ресурсов
        print("[INFO] Освобождение камеры и закрытие сокета...")
        cap.release()
        sock.close()
        end_time = time.time()
        total_time = end_time - start_time
        actual_fps = frame_count / total_time if total_time > 0 else 0
        print(f"[INFO] Отправлено {frame_count} кадров за {total_time:.2f} сек (реальный FPS: {actual_fps:.2f})")
        print("[INFO] Завершение работы.")

if __name__ == "__main__":
    main()