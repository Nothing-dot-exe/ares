@echo off
setlocal
title Ares IDE - Native Desktop Application
 
echo ========================================================
echo   Launching Ares IDE Native Desktop Application
echo ========================================================
echo.

pushd %~dp0

:: 1. Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Terminate old background dev servers, stale processes, and clean caches
echo [*] Preparing clean single-window desktop environment...
call node scripts\prepare-desktop.mjs

:: 3. Unblock binaries in case of Windows Mark-of-the-Web
powershell -NoProfile -Command "Get-ChildItem -Path '.build\electron' -Recurse -ErrorAction SilentlyContinue | Unblock-File"

:: 4. Launch Ares IDE Desktop Window (Zero Browser)
echo [*] Launching Ares IDE Native Desktop Window...
call scripts\code.bat %*

if errorlevel 1 (
    echo.
    echo [ERROR] Desktop application exited with error code %errorlevel%.
    pause
)

popd
endlocal
