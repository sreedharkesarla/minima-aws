@echo off
REM ========================================
REM   Build and Start Minima UIs in Docker
REM ========================================

echo.
echo ========================================
echo   Building Minima UI Services
echo ========================================
echo.

echo [1/3] Building Admin Console...
docker compose build minima-admin
if %errorlevel% neq 0 (
    echo ERROR: Failed to build minima-admin
    pause
    exit /b 1
)

echo.
echo [2/3] Building Chat Widget...
docker compose build minima-chat-widget
if %errorlevel% neq 0 (
    echo ERROR: Failed to build minima-chat-widget
    pause
    exit /b 1
)

echo.
echo [3/3] Starting UI Services...
docker compose up -d minima-admin minima-chat-widget
if %errorlevel% neq 0 (
    echo ERROR: Failed to start UI services
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Admin Console: http://localhost:3001
echo Chat Widget:   http://localhost:3002
echo.
echo Run 'docker compose logs -f minima-admin' to view logs
echo.

timeout /t 3 >nul
start http://localhost:3001

pause
