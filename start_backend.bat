@echo off
echo ========================================================
echo Starting ContextVault FastAPI Backend...
echo ========================================================
cd backend
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing dependencies (if needed)...
pip install -r requirements.txt
echo Launching Uvicorn server on http://127.0.0.1:8000 ...
python main.py
pause
