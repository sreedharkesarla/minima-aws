@echo off
REM ========================================
REM   Minima AWS - Automated System Test
REM ========================================

echo.
echo ====================================
echo   TESTING MINIMA AWS SYSTEM
echo ====================================
echo.

REM Test 1: Backend Services
echo [1/5] Testing Backend Services...
docker ps | findstr /C:"mnma" >nul
if %errorlevel% equ 0 (
    echo   PASS - Backend services running
) else (
    echo   FAIL - Backend services not running
    goto :error
)

REM Test 2: Upload API
echo [2/5] Testing Upload API...
curl -s http://localhost:8001/upload/get_files/test >nul 2>&1
if %errorlevel% equ 0 (
    echo   PASS - Upload API responding
) else (
    echo   FAIL - Upload API not accessible
    goto :error
)

REM Test 3: Chat API
echo [3/5] Testing Chat API...
curl -s http://localhost:8003/docs >nul 2>&1
if %errorlevel% equ 0 (
    echo   PASS - Chat API responding
) else (
    echo   FAIL - Chat API not accessible
    goto :error
)

REM Test 4: Qdrant
echo [4/5] Testing Vector Database...
curl -s http://localhost:6333/collections >nul 2>&1
if %errorlevel% equ 0 (
    echo   PASS - Qdrant accessible
) else (
    echo   FAIL - Qdrant not accessible
    goto :error
)

REM Test 5: UI Files
echo [5/5] Testing UI Components...
if exist "test-ui.html" (
    echo   PASS - Test UI exists
) else (
    echo   FAIL - Test UI missing
    goto :error
)

if exist "minima-admin\package.json" (
    echo   PASS - Admin console exists
) else (
    echo   FAIL - Admin console missing
    goto :error
)

if exist "minima-chat-widget\package.json" (
    echo   PASS - Chat widget exists
) else (
    echo   FAIL - Chat widget missing
    goto :error
)

echo.
echo ====================================
echo   ALL TESTS PASSED!
echo ====================================
echo.
echo System Status: HEALTHY
echo Backend: Running
echo UIs: Ready
echo.
echo Quick Start: start test-ui.html
echo.
goto :end

:error
echo.
echo ====================================
echo   TESTS FAILED
echo ====================================
echo.
echo Please check:
echo   1. Docker services: docker compose up -d
echo   2. Port conflicts
echo   3. System logs
echo.

:end
pause
