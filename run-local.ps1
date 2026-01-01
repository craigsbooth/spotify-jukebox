# run-local.ps1
Write-Host "--- Initializing Local Jukebox ---" -ForegroundColor Cyan

# Kill existing "zombie" processes on ports 8888 and 3000
Write-Host "Cleaning ports..." -ForegroundColor Gray
Stop-Process -Name node -ErrorAction SilentlyContinue

# Start Backend
Write-Host "Launching Backend (8888)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js"

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Launching Frontend (3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

Start-Sleep -Seconds 5
Start-Process "http://localhost:3000"