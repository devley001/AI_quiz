@echo off
echo Starting AI Quiz Application with Teacher Dashboard...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

echo Installing dependencies...
echo.

REM Install root dependencies
echo Installing root dependencies...
call npm install

REM Install backend dependencies
echo Installing backend dependencies...
cd ai_backend
call npm install
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd ai_frontend
call npm install
cd ..

REM Install AI service dependencies
echo Installing AI service dependencies...
cd ai-service
pip install -r requirements.txt
cd ..

echo.
echo All dependencies installed successfully!
echo.
echo Starting services...
echo.

REM Start AI Service
echo Starting AI Service on port 8000...
start "AI Service" cmd /k "cd ai-service\src && python app.py"

REM Wait a moment for AI service to start
timeout /t 3 /nobreak >nul

REM Start Backend
echo Starting Backend on port 5000...
start "Backend" cmd /k "cd ai_backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo Starting Frontend on port 3000...
start "Frontend" cmd /k "cd ai_frontend && npm start"

echo.
echo ========================================
echo All services are starting...
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5000
echo AI Service: http://localhost:8000
echo.
echo Teacher Dashboard: http://localhost:3000/teacher-dashboard
echo.
echo Press any key to close this window...
pause >nul