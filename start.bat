@echo off
title Personal AI Assistant - Launcher
color 0B
cls

echo.
echo  ███╗   ██╗███████╗██╗   ██╗██████╗  █████╗ ██╗
echo  ████╗  ██║██╔════╝██║   ██║██╔══██╗██╔══██╗██║
echo  ██╔██╗ ██║█████╗  ██║   ██║██████╔╝███████║██║
echo  ██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██╔══██║██║
echo  ██║ ╚████║███████╗╚██████╔╝██║  ██║██║  ██║███████╗
echo  ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
echo.
echo  Personal AI Knowledge Assistant
echo  DeepSeek-R1 14B + RTX 4080 + 100%% Local
echo  ─────────────────────────────────────────
echo.

echo [1/3] Starting Ollama...
start "Ollama Server" cmd /k "ollama serve"
timeout /t 4 /nobreak > nul
echo       Ollama started OK

echo [2/3] Starting Backend (FastAPI)...
start "Backend - FastAPI" cmd /k "cd /d C:\Users\brgur\personal-ai-assistant && venv\Scripts\activate && uvicorn backend.main:app --reload --port 8000 --host 0.0.0.0"
timeout /t 5 /nobreak > nul
echo       Backend started OK

echo [3/3] Starting Frontend (React)...
start "Frontend - React" cmd /k "cd /d C:\Users\brgur\personal-ai-assistant\frontend && npm run dev"
timeout /t 5 /nobreak > nul
echo       Frontend started OK

echo.
echo  ─────────────────────────────────────────
echo  All services running!
echo.
echo  Desktop:  http://localhost:5173
echo  Phone:    http://10.139.8.26:5173
echo  API:      http://localhost:8000/health
echo  ─────────────────────────────────────────
echo.
echo  Opening browser...
timeout /t 3 /nobreak > nul
start http://localhost:5173

echo.
echo  Press any key to close this launcher...
pause > nul