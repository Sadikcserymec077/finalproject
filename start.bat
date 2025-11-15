@echo off
title Static Analysis Framework - One-Click Start
color 0A
echo.
echo ========================================
echo   Static Analysis Framework
echo   ONE-CLICK START
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker is not running!
    echo.
    echo Please start Docker Desktop first, then run this script again.
    echo.
    pause
    exit /b 1
)

echo [OK] Prerequisites checked
echo.

REM Check and install dependencies if needed
echo [CHECK] Checking dependencies...
if not exist "mobsf-ui-backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd mobsf-ui-backend
    call npm install
    cd ..
)

if not exist "mobsf-frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd mobsf-frontend
    call npm install
    cd ..
)

echo [OK] Dependencies ready
echo.

REM Check and setup .env file if needed
cd mobsf-ui-backend
if not exist ".env" (
    echo [INFO] Creating .env file with auto-generated API key...
    node generate-api-key.js
    if %errorlevel% neq 0 (
        echo [WARNING] Could not auto-generate API key. Creating default .env...
        (
            echo MOBSF_URL=http://localhost:8000
            echo MOBSF_API_KEY=
            echo PORT=4000
        ) > .env
        echo [INFO] Please update MOBSF_API_KEY in mobsf-ui-backend\.env
    ) else (
        echo [OK] .env file created with auto-generated API key
    )
) else (
    REM Check if API key is set and valid
    findstr /C:"MOBSF_API_KEY=" .env | findstr /V /C:"MOBSF_API_KEY=$" | findstr /V /C:"MOBSF_API_KEY=your-api-key-here" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [INFO] API key not configured. Generating one now...
        node generate-api-key.js
        echo [OK] API key configured
    )
)
cd ..

echo.
echo ========================================
echo   Starting All Services...
echo ========================================
echo.

REM Start MobSF Docker container
echo [1/3] Starting MobSF (Docker)...
cd mobsf-ui-backend
start "MobSF Docker" /MIN cmd /c "docker-compose up"
timeout /t 8 /nobreak >nul
cd ..
echo [OK] MobSF starting...

REM Start Backend Server
echo [2/3] Starting Backend Server...
cd mobsf-ui-backend
start "Backend Server" cmd /k "npm run dev"
timeout /t 4 /nobreak >nul
cd ..
echo [OK] Backend starting...

REM Start Frontend Server
echo [3/3] Starting Frontend Server...
cd mobsf-frontend
start "Frontend Server" cmd /k "set BROWSER=none && npm start"
cd ..
echo [OK] Frontend starting...

echo.
echo ========================================
echo   All Services Started!
echo ========================================
echo.
echo Services running:
echo   - MobSF:        http://localhost:8000
echo   - Backend API:  http://localhost:4000
echo   - Frontend:     http://localhost:3000
echo.
echo Opening browser in 15 seconds...
echo.
echo To stop all services:
echo   1. Close the command windows
echo   2. Run: cd mobsf-ui-backend ^&^& docker-compose down
echo.
echo ========================================
echo.

REM Wait for frontend to be ready, then open browser
timeout /t 15 /nobreak >nul
start http://localhost:3000

echo.
echo Browser opened! If it didn't open, go to: http://localhost:3000
echo.
echo Press any key to close this window (services will keep running)...
pause >nul
