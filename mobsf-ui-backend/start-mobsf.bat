@echo off
REM Script to start MobSF Docker container with persistent API key (Windows)
REM This ensures the same API key is used every time the container runs

REM Set your desired API key (you can change this to any value you want)
if "%MOBSF_API_KEY%"=="" (
    set MOBSF_API_KEY=your-secure-api-key-here
    echo ⚠️  Using default API key. Set MOBSF_API_KEY environment variable for custom key.
)

echo 🚀 Starting MobSF with persistent API key...
echo 📝 API Key: %MOBSF_API_KEY:~0,10%...%MOBSF_API_KEY:~-6%
echo.
echo ⚠️  Save this API key to your .env file:
echo MOBSF_API_KEY=%MOBSF_API_KEY%
echo.

REM Run MobSF container with persistent API key
docker run -it --rm -p 8000:8000 -e MOBSF_API_KEY="%MOBSF_API_KEY%" opensecurity/mobile-security-framework-mobsf:latest

