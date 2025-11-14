@echo off
echo ========================================
echo Static Analysis Framework - Quick Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker is not running or not installed
    echo Please start Docker Desktop or install from https://www.docker.com/
    echo.
    echo Do you want to continue without Docker? (Y/N)
    set /p continue=
    if /i not "%continue%"=="Y" exit /b 1
)

echo.
echo ========================================
echo Step 1: Setting up Backend
echo ========================================
echo.

cd mobsf-ui-backend

REM Install backend dependencies
echo Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend npm install failed!
    pause
    exit /b 1
)

REM Check if .env exists
if not exist .env (
    echo.
    echo [INFO] Creating .env file...
    echo Please enter your MobSF API key when prompted.
    echo.
    set /p apikey="Enter MobSF API Key: "
    (
        echo MOBSF_URL=http://localhost:8000
        echo MOBSF_API_KEY=%apikey%
        echo PORT=4000
    ) > .env
    echo [OK] .env file created
) else (
    echo [OK] .env file already exists
)

echo.
echo ========================================
echo Step 2: Setting up Frontend
echo ========================================
echo.

cd ..\mobsf-frontend

REM Install frontend dependencies
echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend npm install failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Start MobSF Docker container:
echo    docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest
echo.
echo 2. Start Backend (in new terminal):
echo    cd mobsf-ui-backend
echo    npm run dev
echo.
echo 3. Start Frontend (in new terminal):
echo    cd mobsf-frontend
echo    npm start
echo.
echo 4. Open http://localhost:3000 in your browser
echo.
echo ========================================
pause
