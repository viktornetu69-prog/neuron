@echo off
echo ========================================
echo NeuroConstructor - Python Backend
echo ========================================

cd /d "%~dp0backend"

echo Starting FastAPI server on http://localhost:8000...
echo.

python main.py

pause
