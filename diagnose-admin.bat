@echo off
echo ===============================================
echo Minima Admin Diagnostics
echo ===============================================
echo.

echo [1/5] Checking Docker containers...
docker ps --filter "name=minima" --format "table {{.Names}}\t{{.Status}}"
echo.

echo [2/5] Checking admin container health...
docker inspect minima-aws-minima-admin-1 --format "{{.State.Health.Status}}" 2>nul
if errorlevel 1 (
    echo Container not found or not running!
) else (
    echo Health check passed
)
echo.

echo [3/5] Testing HTTP endpoints...
echo Testing root page...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:3001/
echo Testing intake page...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:3001/intake
echo Testing JS bundle...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:3001/assets/index-Bmh4GfUh.js
echo Testing API endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:3001/api/auth/login
echo.

echo [4/5] Checking files in container...
docker exec minima-aws-minima-admin-1 ls -lh /usr/share/nginx/html/assets/ 2>nul
echo.

echo [5/5] Recent container logs...
docker logs minima-aws-minima-admin-1 --tail 5 2>nul
echo.

echo ===============================================
echo Diagnostics Complete
echo ===============================================
echo.
echo Next Steps:
echo 1. Open http://localhost:3001 in your browser
echo 2. Clear browser cache (Ctrl+Shift+Delete)
echo 3. Hard refresh the page (Ctrl+Shift+R)
echo 4. If still blank, press F12 and check Console tab
echo.
pause
