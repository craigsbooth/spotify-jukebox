@echo off
echo Starting the Pinfold Jukebox...

:: 1. Start Backend in a new window (with auto-restart)
start "Jukebox Backend" cmd /k "node --watch server.js"

:: 2. Wait 2 seconds for backend to load
timeout /t 2 /nobreak >nul

:: 3. Start Frontend in a new window
cd client
start "Jukebox Guest App" cmd /k "npm run dev"

:: 4. Open the Host page in Chrome (optional)
timeout /t 5 /nobreak >nul
start http://localhost:3000