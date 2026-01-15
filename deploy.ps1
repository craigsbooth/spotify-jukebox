# ==========================================
# JUKEBOX DEPLOY SCRIPT - V3.5 STABLE (FIXED)
# ==========================================

# --- CONFIGURATION ---
$LocalProject   = "C:\Users\craig\spotify-jukebox"
$KeyPath        = "C:\Users\craig\Downloads\jukebox-key.pem"
$ServerIP       = "13.60.184.64"
$ServerUser     = "ubuntu"
$RemotePath     = "/home/ubuntu/jukebox"
$Domain         = "jukebox.boldron.info"

# --- 0. AUTO-INCREMENT VERSION (HARDENED) ---
$VersionFile = "$LocalProject\version.txt"

# Force check if file exists, if not, create the V3 baseline
if (!(Test-Path $VersionFile)) { 
    Write-Host "[WARN] version.txt not found. Creating new baseline at 3.0.217" -ForegroundColor Yellow
    "3.0.217" | Out-File $VersionFile -Encoding ascii 
}

# Read, Trim, and Split
$RawVersion = (Get-Content $VersionFile).Trim()
$VersionParts = $RawVersion.Split('.')

# Increment the Build Number (the 3rd index)
$BuildNum = [int]$VersionParts[2] + 1
$NewVersion = "$($VersionParts[0]).$($VersionParts[1]).$BuildNum"

# CRITICAL: Write it back to the file immediately
Set-Content -Path $VersionFile -Value $NewVersion

Write-Host "--- Deployment Starting: v$NewVersion ---" -ForegroundColor Yellow
Write-Host "--- (Previous was: $RawVersion) ---" -ForegroundColor DarkGray

# --- 1. PREPARE AND BUILD (LOCAL) ---
Write-Host "--- Building Frontend Locally ---" -ForegroundColor Cyan
Set-Location "$LocalProject\client"

# FIX: Clear Next.js cache to prevent case-sensitivity build errors
if (Test-Path ".next") { 
    Write-Host "Clearing .next cache..." -ForegroundColor Gray
    Remove-Item -Recurse -Force ".next" 
}

$env:NEXT_PUBLIC_APP_VERSION = $NewVersion
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed!"; pause; exit }

# --- 2. STRUCTURED PACKAGING ---
Write-Host "--- Packaging for Server ---" -ForegroundColor Cyan
$DeployTemp = "$env:TEMP\jukebox_staging"
if (Test-Path $DeployTemp) { Remove-Item -Recurse -Force $DeployTemp }

# Create Directory Structure
New-Item -ItemType Directory -Path "$DeployTemp\client" | Out-Null
New-Item -ItemType Directory -Path "$DeployTemp\routes" | Out-Null
New-Item -ItemType Directory -Path "$DeployTemp\data" | Out-Null
New-Item -ItemType Directory -Path "$DeployTemp\server" | Out-Null
New-Item -ItemType Directory -Path "$DeployTemp\public" | Out-Null

# A. Create Version Env
$VersionEnv = @(
    "APP_VERSION=$NewVersion"
)
[System.IO.File]::WriteAllLines("$DeployTemp\.version_env", $VersionEnv)

# B. Copy Backend files
Copy-Item "$LocalProject\*.js" -Destination "$DeployTemp\"
Copy-Item "$LocalProject\package.json" -Destination "$DeployTemp\"
Copy-Item "$LocalProject\version.txt" -Destination "$DeployTemp\"

if (Test-Path "$LocalProject\routes") { Copy-Item -Recurse "$LocalProject\routes\*" -Destination "$DeployTemp\routes\" }
if (Test-Path "$LocalProject\data") { Copy-Item -Recurse "$LocalProject\data\*" -Destination "$DeployTemp\data\" }
if (Test-Path "$LocalProject\server") { Copy-Item -Recurse "$LocalProject\server\*" -Destination "$DeployTemp\server\" }
if (Test-Path "$LocalProject\public") { Copy-Item -Recurse "$LocalProject\public\*" -Destination "$DeployTemp\public\" }

# C. Copy Frontend (Build + Config)
Copy-Item -Recurse "$LocalProject\client\.next" -Destination "$DeployTemp\client\"
Copy-Item -Recurse "$LocalProject\client\public" -Destination "$DeployTemp\client\"
Copy-Item "$LocalProject\client\package.json" -Destination "$DeployTemp\client\"
Copy-Item "$LocalProject\client\next.config.mjs" -Destination "$DeployTemp\client\"

if (Test-Path "$DeployTemp\client\.next\cache") { 
    Remove-Item -Recurse -Force "$DeployTemp\client\.next\cache" 
}

# D. Create Zip
$ZipFile = "$env:TEMP\jukebox_deploy.zip"
if (Test-Path $ZipFile) { Remove-Item $ZipFile }
Compress-Archive -Path "$DeployTemp\*" -DestinationPath $ZipFile -Force

# --- 3. UPLOAD TO SERVER ---
Write-Host "--- Uploading to AWS ---" -ForegroundColor Cyan
scp -i "$KeyPath" "$ZipFile" "${ServerUser}@${ServerIP}:${RemotePath}/"

# --- 4. REMOTE EXECUTION (FIXED DEPENDENCIES) ---
Write-Host "--- Server Restart Sequence ---" -ForegroundColor Cyan

# CRITICAL FIXES IN THIS COMMAND BLOCK:
# 1. sudo chown (Fixes 'Permission Denied' crashes)
# 2. Removed --omit=dev (Fixes 'Module not found: tailwindcss')
$RemoteCmd = "cd ${RemotePath}; " +
             "pm2 stop all || true; " +
             "echo 'Cleaning old artifacts...'; " +
             "sudo rm -rf client/.next client/public client/node_modules node_modules routes data server public; " + 
             "unzip -o jukebox_deploy.zip -x .env; " +
             "sudo chown -R ubuntu:ubuntu ${RemotePath}; " + 
             "if grep -q 'APP_VERSION=' .env; then " +
             "  sed -i 's/^APP_VERSION=.*/APP_VERSION=$NewVersion/' .env; " +
             "else " +
             "  echo 'APP_VERSION=$NewVersion' >> .env; " +
             "fi; " +
             "rm jukebox_deploy.zip .version_env; " +
             "echo 'Installing Backend...'; " +
             "npm install --legacy-peer-deps; " +
             "pm2 delete backend || true; pm2 start server.js --name 'backend'; " +
             "cd client; " +
             "echo 'Installing Frontend...'; " +
             "npm install --legacy-peer-deps; " +
             "pm2 delete frontend || true; pm2 start npm --name 'frontend' -- start; " +
             "pm2 save"

ssh -i "$KeyPath" "${ServerUser}@${ServerIP}" $RemoteCmd

Write-Host "--- Deployment Successful: v$NewVersion ---" -ForegroundColor Green
Set-Location "$LocalProject"