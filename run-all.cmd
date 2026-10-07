@echo off
setlocal
echo ========================================================
echo   TransitLK - Starting Backend & Frontend
echo ========================================================
echo.
echo Starting Backend (http://localhost:4000)...
start "TransitLK Backend" cmd /k "%~dp0run-backend.cmd"
timeout /t 3 /nobreak >nul
echo Starting Frontend (http://localhost:8082)...
start "TransitLK Frontend" cmd /k "%~dp0run-frontend.cmd"
echo.
echo Both servers are launching in separate terminal windows!
echo - Backend:  http://localhost:4000
echo - Frontend: http://localhost:8082
