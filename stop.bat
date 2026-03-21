@echo off
title Stop AI Assistant
echo Stopping all services...
taskkill /f /im ollama.exe >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq Backend - FastAPI" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq Frontend - React" >nul 2>&1
echo Done! All services stopped.
pause
