import cv2
import sys

def detect_cameras():
    print("Camera detection started...")
    for i in range(3):
        try:
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW) if sys.platform == 'win32' else cv2.VideoCapture(i)
            if cap.isOpened():
                print(f"Camera found at index {i}")
                cap.release()
            else:
                print(f"No camera at index {i}")
        except Exception as e:
            print(f"Error checking index {i}: {str(e)}")

if __name__ == "__main__":
    detect_cameras()