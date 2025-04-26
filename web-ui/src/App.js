import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ tracks: 0, alerts: 0, last_alert: null });
  const [streamUrl, setStreamUrl] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const imgRef = useRef(null);

  // URL API и WebSocket получаем из переменных окружения
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    // Загружаем оповещения
    fetch(`${API_URL}/alerts`)
      .then(res => res.json())
      .then(data => {
        setAlerts(data.alerts);
      })
      .catch(err => console.error('Ошибка загрузки оповещений:', err));

    // Загружаем статистику
    fetch(`${API_URL}/stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
      })
      .catch(err => console.error('Ошибка загрузки статистики:', err));

    // Загружаем информацию о потоке
    fetch(`${API_URL}/stream-info`)
      .then(res => res.json())
      .then(data => {
        setStreamUrl(data.analytics_stream);
      })
      .catch(err => console.error('Ошибка загрузки информации о потоке:', err));

    // Интервал для обновления данных каждые 5 секунд
    const interval = setInterval(() => {
      fetch(`${API_URL}/alerts`)
        .then(res => res.json())
        .then(data => {
          setAlerts(data.alerts);
        })
        .catch(err => console.error('Ошибка обновления оповещений:', err));

      fetch(`${API_URL}/stats`)
        .then(res => res.json())
        .then(data => {
          setStats(data);
        })
        .catch(err => console.error('Ошибка обновления статистики:', err));
    }, 5000);

    return () => clearInterval(interval);
  }, [API_URL]);

  // Подключение WebSocket для видеопотока
  useEffect(() => {
    // Функция для подключения к WebSocket
    const connectWebSocket = () => {
      // Закрываем старое соединение, если есть
      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsUrl = streamUrl || WS_URL;
      console.log('Подключение к WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket соединение установлено');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        if (imgRef.current) {
          imgRef.current.src = event.data;
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket ошибка:', error);
        setConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket соединение закрыто');
        setConnected(false);

        // Попытка переподключения через 3 секунды
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    };

    // Подключаемся, если URL потока известен
    if (streamUrl || WS_URL) {
      connectWebSocket();
    }

    // Очистка при размонтировании
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [streamUrl, WS_URL]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Система компьютерного зрения</h1>
      </header>

      <div className="container">
        <div className="video-container">
          <h2>Видеопоток</h2>
          <div className="video-wrapper">
            {connected ? (
              <img ref={imgRef} alt="Видеопоток" style={{ width: '100%', height: 'auto' }} />
            ) : (
              <div className="video-placeholder">
                <p>Подключение к видеопотоку...</p>
              </div>
            )}
          </div>
        </div>

        <div className="info-container">
          <div className="stats-box">
            <h2>Статистика</h2>
            <div className="stats-content">
              <p><strong>Всего треков:</strong> {stats.tracks}</p>
              <p><strong>Всего оповещений:</strong> {stats.alerts}</p>
              <p><strong>Последнее оповещение:</strong> {stats.last_alert || 'Нет данных'}</p>
            </div>
          </div>

          <div className="alerts-box">
            <h2>Последние оповещения</h2>
            <div className="alerts-list">
              {alerts.length > 0 ? (
                alerts.slice().reverse().slice(0, 10).map((alert, index) => (
                  <div key={index} className="alert-item">
                    <div className="alert-time">{alert.datetime || new Date(alert.timestamp * 1000).toLocaleString()}</div>
                    <div className="alert-message">
                      {alert.message ||
                       `Объект ID:${alert.track_id} обнаружен ${alert.bbox ? `в области [${alert.bbox.map(v => v.toFixed(1)).join(', ')}]` : ''}`}
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-alerts">Нет оповещений</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;