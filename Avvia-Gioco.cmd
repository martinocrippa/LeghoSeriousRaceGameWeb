@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installa Node.js LTS prima di avviare Legho.
  echo https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Prima preparazione del gioco. Serve una connessione Internet.
  call npm ci --cache .npm-cache
  if errorlevel 1 (
    echo Preparazione non riuscita. Controlla la connessione e riprova.
    pause
    exit /b 1
  )
)
echo.
echo Legho - Chiudi questa finestra per spegnere il gioco.
echo.
call npm run dev -- --port 5173 --open
if errorlevel 1 pause
