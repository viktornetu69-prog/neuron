@echo off
echo ========================================
echo NeuroConstructor - Electron App
echo ========================================

cd /d "%~dp0"

echo Starting Electron desktop app...
echo.

set NODE_ENV=development
npm run electron:dev

pause
