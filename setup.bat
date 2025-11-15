@echo off
setlocal enabledelayedexpansion
echo ========================================
echo Static Analysis Framework - Quick Setup
echo ========================================
echo.

REM Check if Node.js is installed (try multiple methods)
set NODE_OK=0
where node >nul 2>&1
if %errorlevel% equ 0 (
    set NODE_OK=1
) else (
    node --version >nul 2>&1
    if %errorlevel% equ 0 set NODE_OK=1
)

if %NODE_OK% equ 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    echo After installation, close and reopen this terminal.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found: 
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VERSION=%%v
echo   %NODE_VERSION%
echo.

REM Check if Docker is running (optional for setup)
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker is not running or not installed
    echo Please start Docker Desktop or install from https://www.docker.com/
    echo You can install dependencies now and start Docker later.
    echo.
    set /p continue="Do you want to continue without Docker? (Y/N): "
    if /i not "!continue!"=="Y" exit /b 1
) else (
    echo [OK] Docker is running
)
echo.

echo.
echo ========================================
echo Step 1: Installing Root Dependencies
echo ========================================
echo.

REM Install root dependencies first
echo Installing root dependencies...
if exist package.json (
    call npm install
    if !errorlevel! neq 0 (
        echo [WARNING] Root npm install had issues, continuing...
    )
) else (
    echo [INFO] No package.json in root, skipping...
)
echo.

echo ========================================
echo Step 2: Setting up Backend
echo ========================================
echo.

cd mobsf-ui-backend

REM Check if backend directory exists
if not exist package.json (
    echo [ERROR] mobsf-ui-backend directory not found!
    echo Please make sure you're in the project root directory.
    cd ..
    pause
    exit /b 1
)

REM Install backend dependencies
echo Installing backend dependencies...
call npm install
if !errorlevel! neq 0 (
    echo [ERROR] Backend npm install failed!
    echo Please check your internet connection and try again.
    cd ..
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
echo.
echo ========================================
echo Step 3: Setting up Frontend
echo ========================================
echo.

cd ..\mobsf-frontend

REM Check if frontend directory exists
if not exist package.json (
    echo [ERROR] mobsf-frontend directory not found!
    echo Please make sure you're in the project root directory.
    cd ..
    pause
    exit /b 1
)

REM Install frontend dependencies
echo Installing frontend dependencies...
call npm install
if !errorlevel! neq 0 (
    echo [ERROR] Frontend npm install failed!
    echo Please check your internet connection and try again.
    cd ..
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
cd ..

echo.
echo ========================================
echo Step 4: Creating .env File
echo ========================================
echo.

cd mobsf-ui-backend

REM Check if .env exists
if not exist .env (
    echo Creating .env file...
    echo.
    echo Please enter your MobSF API key.
    echo If you don't have it yet, you can:
    echo   1. Start MobSF first: docker-compose up -d
    echo   2. Open http://localhost:8000
    echo   3. Go to Settings -^> API Key
    echo   4. Copy the API key
    echo.
    echo You can leave it blank for now and update it later in mobsf-ui-backend\.env
    echo.
    set /p apikey="Enter MobSF API Key (or press Enter to skip): "
    
    (
        echo MOBSF_URL=http://localhost:8000
        echo MOBSF_API_KEY=!apikey!
        echo PORT=4000
        echo.
        echo # Optional: SonarQube configuration
        echo SONAR_HOST=
        echo SONAR_TOKEN=
    ) > .env
    
    if "!apikey!"=="" (
        echo [INFO] .env file created with placeholder. Update MOBSF_API_KEY later.
    ) else (
        echo [OK] .env file created with API key
    )
) else (
    echo [OK] .env file already exists
)
cd ..

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo All dependencies installed successfully!
echo.
echo Next steps:
echo.
echo 1. Make sure Docker Desktop is running
echo.
echo 2. Update MOBSF_API_KEY in mobsf-ui-backend\.env if needed:
echo    - Start MobSF: cd mobsf-ui-backend ^&^& docker-compose up -d
echo    - Open http://localhost:8000
echo    - Go to Settings -^> API Key
echo    - Copy the key to mobsf-ui-backend\.env
echo.
echo 3. Start all services:
echo    start.bat
echo    OR
echo    npm start
echo.
echo 4. Open http://localhost:3000 in your browser
echo.
echo ========================================
echo.
pause
