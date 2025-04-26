from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import time
import json
import os
from datetime import datetime

# Инициализация FastAPI
app = FastAPI(title="Vision System API")

# Добавляем CORS для обеспечения доступа с фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене укажите конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Создаем модели данных
class Alert(BaseModel):
    timestamp: Optional[float] = None
    track_id: Optional[int] = None
    bbox: Optional[List[float]] = None
    confidence: Optional[float] = None
    message: Optional[str] = None


# Хранилище оповещений (в реальной системе использовать БД)
alerts = []
last_alerts_cleanup = time.time()


@app.get("/")
def read_root():
    """Корневой эндпоинт"""
    return {"status": "ok", "version": "1.0.0"}


@app.post("/alerts")
def create_alert(alert: Alert):
    """Создание нового оповещения"""
    if alert.timestamp is None:
        alert.timestamp = time.time()

    # Добавляем дату и время для удобства просмотра на фронтенде
    alert_dict = alert.dict()
    alert_dict["datetime"] = datetime.fromtimestamp(alert.timestamp).strftime('%Y-%m-%d %H:%M:%S')

    alerts.append(alert_dict)

    # Очистка старых оповещений (оставляем только последние 100)
    global last_alerts_cleanup
    if len(alerts) > 100 or time.time() - last_alerts_cleanup > 3600:
        alerts[:] = alerts[-100:]
        last_alerts_cleanup = time.time()

    return {"status": "success", "id": len(alerts)}


@app.get("/alerts")
def get_alerts(limit: int = 100):
    """Получение списка оповещений"""
    return {"alerts": alerts[-limit:]}


@app.get("/stats")
def get_stats():
    """Получение статистики по трекам"""
    if not alerts:
        return {"tracks": 0, "alerts": 0}

    # Подсчитываем количество уникальных треков
    unique_tracks = set()
    for alert in alerts:
        if "track_id" in alert and alert["track_id"] is not None:
            unique_tracks.add(alert["track_id"])

    return {
        "tracks": len(unique_tracks),
        "alerts": len(alerts),
        "last_alert": alerts[-1]["datetime"] if alerts else None
    }


@app.get("/stream-info")
def get_stream_info():
    """Информация о видеопотоке"""
    return {
        "analytics_stream": "http://" + os.environ.get("HOST_IP", "localhost") + ":8080/ws",
        "status": "active"
    }