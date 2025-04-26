FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    python3.10 python3.10-dev python3-pip git \
    libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev \
    ffmpeg wget curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Обновление pip
RUN python3 -m pip install --upgrade pip

# Установка deep_sort_realtime
RUN pip install deep_sort_realtime

# Установка PyTorch с поддержкой CUDA 11.8
RUN pip install torch==2.0.1+cu118 torchvision==0.15.2+cu118 torchaudio==2.0.2 \
    --extra-index-url https://download.pytorch.org/whl/cu118

# Переход в рабочую директорию
WORKDIR /app

# Клонируем YOLOv5 внутрь /app/yolov5 (ВАЖНО!)
RUN git clone --branch v6.2 --depth 1 https://github.com/ultralytics/yolov5.git yolov5
RUN pip install -r yolov5/requirements.txt

# Копирование зависимостей
COPY requirements.txt ./
RUN pip install -r requirements.txt

# Копирование моделей и кода
COPY main.py ./
COPY deep_sort_weights ./deep_sort_weights/
COPY yolov5s.pt ./

# Установка переменных окружения
ENV PYTHONUNBUFFERED=1 \
    MODEL_PATH=/app/yolov5s.pt \
    DEEPSORT_MODEL_PATH=/app/deep_sort_weights/mars-small128.pb

# Открытые порты
EXPOSE 8080/tcp
EXPOSE 5005/udp

# Команда запуска
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

