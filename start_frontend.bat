@echo off
echo ========================================================
echo Starting ContextVault Vite + React Frontend...
echo ========================================================
cd frontend
if not exist node_modules (
    echo Installing npm dependencies...
    call npm install
)
echo Launching frontend server on http://localhost:3000 ...
call npm run dev
pause
