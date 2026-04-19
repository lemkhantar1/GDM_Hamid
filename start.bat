@echo off
REM La Chambre du Debat - launcher pour Windows.
setlocal EnableDelayedExpansion

cd /d "%~dp0"

REM --- Prerequis -----------------------------------------------------------
where python >nul 2>&1
if errorlevel 1 (
  echo X Python introuvable. Installez-le depuis https://www.python.org/downloads/
  pause
  exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
  echo X Node.js introuvable. Installez-le depuis https://nodejs.org/
  pause
  exit /b 1
)

REM --- Backend -------------------------------------------------------------
echo ^> backend : preparation...
pushd backend
if not exist .venv (
  python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt

if not exist .env (
  copy /Y .env.example .env >nul
  echo.
  echo ! backend\.env cree a partir du modele.
  echo    Ouvre ce fichier et renseigne :
  echo      - ANTHROPIC_API_KEY  (cle Claude^)
  echo      - ELEVENLABS_API_KEY (cle ElevenLabs^)
  echo.
  echo    Relance ensuite start.bat
  notepad .env
  popd
  exit /b 1
)
popd

REM --- Frontend ------------------------------------------------------------
echo ^> frontend : preparation...
pushd frontend
if not exist node_modules (
  call npm install --silent
)
popd

REM --- Lancement -----------------------------------------------------------
echo.
echo ^> backend sur :8787
start "Chambre du Debat - backend" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && python -m uvicorn main:app --host 0.0.0.0 --port 8787 --log-level warning"

timeout /t 2 /nobreak >nul

echo ^> frontend sur :5280
start "Chambre du Debat - frontend" cmd /k "cd /d %~dp0frontend && node_modules\.bin\vite.cmd --host --port 5280 --strictPort"

echo.
echo ===============================================
echo   La Chambre du Debat
echo   ^> http://localhost:5280
echo.
echo   Fermez les deux fenetres pour tout arreter.
echo ===============================================
echo.
pause
