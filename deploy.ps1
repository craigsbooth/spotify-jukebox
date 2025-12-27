# ==========================================
# JUKEBOX DEPLOY SCRIPT - DIRECTORY SYNC VER
# ==========================================

# --- CONFIGURATION ---
$LocalProject   = "C:\Users\craig\spotify-jukebox"
$KeyPath        = "C:\Users\craig\Downloads\jukebox-key.pem"
$ServerIP       = "13.60.184.64"
$ServerUser     = "ubuntu"
$RemotePath     = "/home/ubuntu/jukebox"
$Domain         = "jukebox.boldron.info"

# --- 0. AUTO-INCREMENT VERSION ---
$VersionFile = "$LocalProject\version.txt"
if (!(Test-Path $VersionFile)) { "2.0.0" | Out-File $VersionFile -Encoding ascii }
$CurrentVersion = Get-Content $VersionFile
$VersionParts = $CurrentVersion.Split('.')
$VersionParts[2] = [int]$VersionParts[2] + 1
$NewVersion = "$($VersionParts[0]).$($VersionParts[1]).$($VersionParts[2])"
$NewVersion | Out-File $VersionFile -Encoding ascii

Write-Host "--- Starting Deployment: v$NewVersion ---" -ForegroundColor Yellow

# --- 1. SAFETY CHECK ---
Write-Host "--- Running Server API Tests ---" -ForegroundColor Magenta
Set-Location "$LocalProject"
npm test
if ($LASTEXITCODE -ne 0) { Write-Host "SERVER TESTS FAILED." -ForegroundColor Red; pause; exit }

Write-Host "--- Running Client UI Tests ---" -ForegroundColor Magenta
Set-Location "$LocalProject\client"
npm test -- --watchAll=false
if ($LASTEXITCODE -ne 0) { Write-Host "CLIENT TESTS FAILED." -ForegroundColor Red; pause; exit }

# --- 2. PREPARE AND BUILD ---
Write-Host "--- Building Frontend ---" -ForegroundColor Cyan
$env:NEXT_PUBLIC_APP_VERSION = $NewVersion
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed!"; pause; exit }

# --- 3. STRUCTURED PACKAGING (The Fix) ---
Write-Host "--- Structuring Files for Upload ---" -ForegroundColor Cyan
$DeployTemp = "$env:TEMP\jukebox_staging"
if (Test-Path $DeployTemp) { Remove-Item -Recurse -Force $DeployTemp }
New-Item -ItemType Directory -Path "$DeployTemp\client" | Out-Null

# Copy Backend Files to Root
Copy-Item "$LocalProject\server.js" -Destination "$DeployTemp\"
Copy-Item "$LocalProject\package.json" -Destination "$DeployTemp\"

# Copy Frontend Build to client/ folder
Copy-Item -Recurse "$LocalProject\client\.next" -Destination "$DeployTemp\client\"
Copy-Item -Recurse "$LocalProject\client\public" -Destination "$DeployTemp\client\"
Copy-Item "$LocalProject\client\package.json" -Destination "$DeployTemp\client\"
Copy-Item "$LocalProject\client\next.config.ts" -Destination "$DeployTemp\client\"

$ZipFile = "$env:TEMP\jukebox_deploy.zip"
if (Test-Path $ZipFile) { Remove-Item $ZipFile }
Compress-Archive -Path "$DeployTemp\*" -DestinationPath $ZipFile -Force

# --- 4. UPLOAD TO SERVER ---
Write-Host "--- Uploading to Server ---" -ForegroundColor Cyan
# Added the destination address which was missing
scp -i "$KeyPath" "$ZipFile" "${ServerUser}@${ServerIP}:${RemotePath}/"

# --- 5. EXECUTE REMOTE COMMANDS ---
Write-Host "--- Server Installation & Restart ---" -ForegroundColor Cyan
$RemoteCmd = "cd ${RemotePath}; unzip -o jukebox_deploy.zip; rm jukebox_deploy.zip; " +
             "echo 'SPOTIFY_CLIENT_ID=3c5e00fa03dc46109048d2905f87332e' > .env; " +
             "echo 'SPOTIFY_CLIENT_SECRET=0035087b530a4a30a447a280cbb9b9fd' >> .env; " +
             "echo 'REDIRECT_URI=https://${Domain}/api/callback' >> .env; " +
             "echo 'PORT=8888' >> .env; " +
             "echo 'FRONTEND_URL=https://${Domain}' >> .env; " +
             "sudo chown -R ${ServerUser}:${ServerUser} ${RemotePath}; " +
             "npm install --omit=dev --legacy-peer-deps; " +
             "pm2 delete backend || true; pm2 start server.js --name 'backend'; " +
             "cd client; npm install --omit=dev --legacy-peer-deps; " +
             "pm2 delete frontend || true; pm2 start node_modules/next/dist/bin/next --name 'frontend' --cwd '${RemotePath}/client' -- start; " +
             "pm2 save"

ssh -i "$KeyPath" "${ServerUser}@${ServerIP}" $RemoteCmd

Write-Host "--- Deployment Successful: v$NewVersion ---" -ForegroundColor Green
Set-Location "$LocalProject"
Start-Process "https://$Domain"