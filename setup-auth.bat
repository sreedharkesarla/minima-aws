@echo off
REM ==========================================
REM   Setup Authentication & Database
REM ==========================================

echo.
echo ========================================
echo   Setting Up Authentication System
echo ========================================
echo.

echo [1/4] Rebuilding mnma-upload service with auth...
docker compose build mnma-upload
if %errorlevel% neq 0 (
    echo ERROR: Failed to build mnma-upload
    pause
    exit /b 1
)

echo.
echo [2/4] Rebuilding minima-admin with login page...
docker compose build minima-admin
if %errorlevel% neq 0 (
    echo ERROR: Failed to build minima-admin
    pause
    exit /b 1
)

echo.
echo [3/4] Restarting services...
docker compose down mnma-upload minima-admin
docker compose up -d mnma-upload minima-admin
if %errorlevel% neq 0 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)

echo.
echo [4/4] Waiting for database initialization...
timeout /t 10 >nul

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Default Credentials:
echo   Super User: admin / Admin@123
echo   Test Users: test, operator1, viewer1 / Test@123
echo.
echo Admin Console: http://localhost:3001
echo.
echo IMPORTANT: Change default passwords in production!
echo.
echo View logs: docker compose logs -f mnma-upload
echo.

timeout /t 3 >nul
start http://localhost:3001

pause
