@echo off
REM ========================================
REM   Check Build Status and Start Services
REM ========================================

echo.
echo ========================================
echo   Checking Docker Build Status
echo ========================================
echo.

REM Check if images exist
docker images | findstr /C:"minima-admin" >nul
if %errorlevel% equ 0 (
    echo [OK] minima-admin image built
    set ADMIN_READY=1
) else (
    echo [WAIT] minima-admin still building...
    set ADMIN_READY=0
)

docker images | findstr /C:"minima-chat-widget" >nul
if %errorlevel% equ 0 (
    echo [OK] minima-chat-widget image built
    set WIDGET_READY=1
) else (
    echo [WAIT] minima-chat-widget still building...
    set WIDGET_READY=0
)

echo.

if %ADMIN_READY%==0 (
    echo Builds are still in progress. Please wait...
    echo This can take 5-10 minutes on first build.
    echo.
    pause
    exit /b 1
)

if %WIDGET_READY%==0 (
    echo Builds are still in progress. Please wait...
    echo This can take 5-10 minutes on first build.
    echo.
    pause
    exit /b 1
)

echo All images built successfully!
echo.
echo Starting services...
docker compose up -d minima-admin minima-chat-widget

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   Services Started Successfully!
    echo ========================================
    echo.
    echo Admin Console: http://localhost:3001
    echo Chat Widget:   http://localhost:3002
    echo.
    echo Opening admin console in browser...
    timeout /t 2 >nul
    start http://localhost:3001
) else (
    echo.
    echo ERROR: Failed to start services
    echo Run 'docker compose logs' to see errors
)

echo.
pause
