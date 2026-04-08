@echo off
REM Initialize Minima Admin Database
REM Run this script to set up authentication

echo ========================================
echo   Minima Admin Database Setup
echo ========================================
echo.
echo This will create the users and roles tables
echo and add the default super user.
echo.
echo Default credentials:
echo   Username: admin
echo   Password: Admin@123
echo.
pause

echo.
echo Running SQL initialization...
echo.

REM Try to find MySQL
set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe

if not exist "%MYSQL_BIN%" (
    set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe
)

if not exist "%MYSQL_BIN%" (
    echo ERROR: MySQL not found!
    echo Please install MySQL or update the path in this script.
    pause
    exit /b 1
)

echo Found MySQL: %MYSQL_BIN%
echo.
echo Enter MySQL root password when prompted...
echo.

"%MYSQL_BIN%" -u root -p < "%~dp0quick_init.sql"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   SUCCESS!
    echo ========================================
    echo.
    echo Database initialized successfully!
    echo.
    echo You can now login to Minima Admin:
    echo   URL: http://localhost:3001
    echo   Username: admin
    echo   Password: Admin@123
    echo.
    echo IMPORTANT: Change this password after first login!
    echo.
) else (
    echo.
    echo ========================================
    echo   ERROR!
    echo ========================================
    echo.
    echo Database initialization failed.
    echo Please check:
    echo   1. MySQL root password is correct
    echo   2. MySQL service is running
    echo   3. You have admin privileges
    echo.
)

pause
