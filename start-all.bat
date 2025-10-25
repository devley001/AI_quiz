@echo off
echo Starting AI Quiz Application...

echo Starting Backend...
start "Backend" cmd /k "cd ai_backend && npm start"

echo Starting Frontend...
start "Frontend" cmd /k "cd ai_frontend && npm start"

echo Starting AI Service...
start "AI Service" cmd /k "cd ai-service && python src/app.py"

echo All services are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo AI Service: http://localhost:8000
pause