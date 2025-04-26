# import cv2
#
# def check_cameras():
#     for i in range(3):
#         try:
#             cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
#             if cap.isOpened():
#                 print(f"[SUCCESS] Camera index {i} is available")
#                 cap.release()
#             else:
#                 print(f"[WARNING] Camera index {i} found but cannot be opened")
#         except Exception as e:
#             print(f"[ERROR] Camera index {i}: {str(e)}")
#
# if __name__ == "__main__":
#     check_cameras()
# from ultralytics import YOLO
# model = YOLO('yolov5nu.pt')

# Создайте test_camera.py в camera_server:
import cv2

for i in range(3):
    cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
    if cap.isOpened():
        print(f"Camera found at index {i}")
        cap.release()
    else:
        print(f"No camera at index {i}")