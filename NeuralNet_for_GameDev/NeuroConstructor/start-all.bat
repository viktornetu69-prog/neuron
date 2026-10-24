@echo off
:: NeuroConstructor - Запуск всех компонентов без окон консоли

setlocal

:: Создаем временный VBS скрипт для скрытия окон
set "VBS=%temp%\NeuroHidden.vbs"

> "%VBS%" echo Set WshShell = CreateObject("WScript.Shell")
>> "%VBS%" echo WScript.Sleep 1000
>> "%VBS%" echo ' 1. Запуск Python Backend (скрыто)
>> "%VBS%" echo WshShell.Run """python"" ""%~dp0backend\main.py""", 0, False
>> "%VBS%" echo WScript.Sleep 3000
>> "%VBS%" echo ' 2. Запуск React Frontend (скрыто)
>> "%VBS%" echo WshShell.Run """cmd"" /c cd /d ""%~dp0frontend"" && npm run dev", 0, False
>> "%VBS%" echo WScript.Sleep 3000
>> "%VBS%" echo ' 3. Запуск Electron UI (отображается)
>> "%VBS%" echo WshShell.Run """%~dp0node_modules\electron\dist\electron.exe"" ""%~dp0electron\main.js""", 1, False
>> "%VBS%" echo WScript.Sleep 1000
>> "%VBS%" echo Set WshShell = Nothing

:: Запускаем VBS скрипт
cscript //nologo "%VBS%"

:: Удаляем временный файл
del "%VBS%" >nul 2>&1
