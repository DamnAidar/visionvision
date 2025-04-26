# Запускать от администратора
Set-ExecutionPolicy Bypass -Scope Process -Force

# Разрешить доступ к камере
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam" /v Value /t REG_SZ /d "Allow" /f

# Настроить сеть
netsh advfirewall firewall add rule name="Vision System" dir=in action=allow protocol=TCP localport=3000,8000,5005

# Обновить WSL
wsl --update
wsl --shutdown

Write-Host "✅ Настройка завершена. Перезагрузите компьютер."