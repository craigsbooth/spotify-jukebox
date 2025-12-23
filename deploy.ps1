# ==========================================
# JUKEBOX DEPLOY SCRIPT - FINAL SYNC VER
# ==========================================

# --- CONFIGURATION ---
$LocalProject   = "C:\Users\craig\spotify-jukebox"
$KeyPath        = "C:\Users\craig\Downloads\jukebox-key.pem"
$ServerIP       = "16.171.26.218"
$ServerUser     = "ubuntu"
$RemotePath     = "~/jukebox"
$Domain         = "jukebox.boldron.info"

# --- 0. AUTO-INCREMENT VERSION ---
$VersionFile = "$LocalProject\version.txt"
if (!(Test-Path $VersionFile)) { "1.0.0" | Out-File $VersionFile -Encoding ascii }
$CurrentVersion = Get-Content $VersionFile
$VersionParts = $CurrentVersion.Split('.')
$VersionParts[2] = [int]$VersionParts[2] + 1
$NewVersion = "$($VersionParts[0]).$($VersionParts[1]).$($VersionParts[2])"
$NewVersion | Out-File $VersionFile -Encoding ascii

Write-Host "--- Starting Deployment: v$NewVersion ---" -ForegroundColor Yellow

# --- 1. SAFETY CHECK: RUN UNIT TESTS ---
Write-Host "--- Running Unit Tests ---" -ForegroundColor Magenta
Set-Location "$LocalProject\client"
npm test -- --watchAll=false
if ($LASTEXITCODE -ne 0) { Write-Host "TESTS FAILED. Deployment Aborted." -ForegroundColor Red; pause; exit }

# --- 2. PREPARE AND BUILD ---
Write-Host "--- Building Frontend ---" -ForegroundColor Cyan
$PkgFile = "package.json"
$PkgContent = Get-Content $PkgFile | ConvertFrom-Json
$PkgContent.version = $NewVersion
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$JsonString = $PkgContent | ConvertTo-Json
[System.IO.File]::WriteAllText((Resolve-Path $PkgFile), $JsonString, $Utf8NoBom)

$env:NEXT_PUBLIC_APP_VERSION = $NewVersion
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed!"; pause; exit }

# --- 3. ZIP AND UPLOAD ---
Write-Host "--- Packaging and Uploading ---" -ForegroundColor Cyan
$ZipFile = "$env:TEMP\jukebox_deploy.zip"
if (Test-Path $ZipFile) { Remove-Item $ZipFile }

# We package the build AND the server.js file from the parent directory
Compress-Archive -Path ".\.next", ".\public", ".\package.json", ".\next.config.ts", "$LocalProject\server.js" -DestinationPath $ZipFile -Force
scp -i $KeyPath $ZipFile ${ServerUser}@${ServerIP}:${RemotePath}/client/

# --- 4. EXECUTE REMOTE COMMANDS ---
Write-Host "--- Server Config & Restart ---" -ForegroundColor Cyan
# 1. Unzip inside client folder
# 2. Move server.js up one level to root ~/jukebox
# 3. Regenerate .env
# 4. Restart all processes via PM2
$RemoteCmd = "cd ${RemotePath}/client; unzip -o jukebox_deploy.zip; mv server.js ../; rm jukebox_deploy.zip; echo 'SPOTIFY_CLIENT_ID=3c5e00fa03dc46109048d2905f87332e' > ${RemotePath}/.env; echo 'SPOTIFY_CLIENT_SECRET=0035087b530a4a30a447a280cbb9b9fd' >> ${RemotePath}/.env; echo 'REDIRECT_URI=https://${Domain}/api/callback' >> ${RemotePath}/.env; echo 'PORT=8888' >> ${RemotePath}/.env; echo 'FRONTEND_URL=https://${Domain}' >> ${RemotePath}/.env; sudo chown -R ${ServerUser}:${ServerUser} ${RemotePath}; cd ${RemotePath}; npm install --production --legacy-peer-deps; pm2 restart all"

ssh -i $KeyPath ${ServerUser}@${ServerIP} $RemoteCmd

Write-Host "--- Deployment Successful: v$NewVersion ---" -ForegroundColor Green
Start-Process "https://$Domain"