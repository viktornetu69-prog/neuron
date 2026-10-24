@echo off
:: NeuroConstructor - Полная перезагрузка и запуск

setlocal

echo ========================================
echo  NeuroConstructor - Остановка процессов
echo ========================================

echo [*] Остановка Python...
taskkill /F /IM python.exe >nul 2>&1

echo [*] Остановка Node...
taskkill /F /IM node.exe >nul 2>&1

echo [*] Ожидание освобождения портов...
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo  NeuroConstructor - Запуск
echo ========================================

echo [*] Запуск Backend (скрыто)...
start "" /MIN cmd /c "cd /d "%~dp0backend" && python main.py"

echo [*] Запуск Frontend (скрыто)...
timeout /t 2 /nobreak >nul
start "" /MIN cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo [*] Ожидание инициализации серверов...
timeout /t 8 /nobreak >nul

echo [*] Запуск Electron...
if exist "%~dp0node_modules\electron\dist\electron.exe" (
    start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0electron\main.js"
) else (
    echo [!] Electron не найден по пути: %~dp0node_modules\electron\dist\electron.exe
)

echo.
echo ========================================
echo  NeuroConstructor запущен!
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:3000
echo ========================================
