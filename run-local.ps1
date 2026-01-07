# run-local.ps1
Write-Host "--- Initializing Local Jukebox ---" -ForegroundColor Cyan

# Kill existing "zombie" processes on ports 8888 and 3000
Write-Host "Cleaning ports..." -ForegroundColor Gray
Stop-Process -Name node -ErrorAction SilentlyContinue

# --- FIX: FORCE CORRECT ENVIRONMENT CONFIGURATION ---
# We explicitly set these variables in the current session so the child processes inherit them.
# This overrides 'localhost' in your .env file to match the Spotify Whitelist (127.0.0.1).
$env:REDIRECT_URI = "http://127.0.0.1:8888/callback"
$env:NODE_ENV = "development"

# Start Backend
Write-Host "Launching Backend (8888) with URI: $env:REDIRECT_URI" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js"

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Launching Frontend (3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

Start-Sleep -Seconds 5

# Open browser to 127.0.0.1 explicitly to match the backend session
Start-Process "http://127.0.0.1:3000"