@echo off
setlocal
title Maximal Square Visualizer
cd /d "%~dp0"

if not exist "node_modules\vite" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting Maximal Square Visualizer...
echo URL: http://localhost:5173
echo Press Ctrl+C to stop the server.

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 900; Start-Process 'http://localhost:5173'"
call npm run dev -- --host 127.0.0.1 --port 5173

endlocal
