@echo off
echo ========================================
echo   Minima AWS - Quick Start
echo ========================================
echo.
echo Backend Status:
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr /C:"mnma"
echo.
echo Starting Simple Test UI...
echo.
echo Access Instructions:
echo   URL: file:///c:/Engineering/minima-aws/test-ui.html
echo   Login: test / test123
echo.
start test-ui.html
echo.
echo UI opened in your default browser!
echo.
pause
