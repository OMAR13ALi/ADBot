@echo off
echo 🤖 ADBot Authentication API
echo =============================

:: Check if we're in the right directory
if not exist "main.py" (
    echo ❌ Error: main.py not found
    echo Please run this from the auth_api directory
    pause
    exit /b 1
)

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Python not found
    echo Please install Python and add it to your PATH
    pause
    exit /b 1
)

echo ✅ Python found
echo 📦 Installing/checking dependencies...

:: Install dependencies
pip install -r requirements.txt >nul 2>&1

echo 🚀 Starting ADBot Authentication API...
echo.
echo 🌐 Login page: http://localhost:8001
echo 📖 API docs: http://localhost:8001/docs
echo 📊 Status: http://localhost:8001/status
echo.
echo Press Ctrl+C to stop the server
echo =============================

:: Start the API
python start_auth.py

pause 