import React, { useEffect, useState } from 'react';

function App() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(res => res.json())
      .then(data => console.log('API Status:', data));
  }, []);

  return (
    <div className="App">
      <h1>Vision Analytics Dashboard</h1>
      <div className="alerts-container">
        {alerts.map((alert, index) => (
          <div key={index} className="alert-card">
            <p>Alert ID: {alert.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;