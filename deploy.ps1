# ==========================================
# JUKEBOX DEPLOY SCRIPT - NO EMOJI VERSION
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

# --- 1. PREPARE AND BUILD ---
Write-Host "--- Building Frontend ---" -ForegroundColor Cyan
Set-Location "$LocalProject\client"

$PkgFile = "package.json"
$PkgContent = Get-Content $PkgFile | ConvertFrom-Json
$PkgContent.version = $NewVersion

# Save WITHOUT BOM character
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$JsonString = $PkgContent | ConvertTo-Json
[System.IO.File]::WriteAllText((Resolve-Path $PkgFile), $JsonString, $Utf8NoBom)

$env:NEXT_PUBLIC_APP_VERSION = $NewVersion
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed!"; pause; exit }

# --- 2. ZIP THE FILES ---
Write-Host "--- Zipping deployment package ---" -ForegroundColor Cyan
$ZipFile = "$env:TEMP\jukebox_deploy.zip"
if (Test-Path $ZipFile) { Remove-Item $ZipFile }
Compress-Archive -Path ".\.next", ".\public", ".\package.json", ".\next.config.ts" -DestinationPath $ZipFile -Force

# --- 3. UPLOAD ---
Write-Host "--- Uploading to AWS ---" -ForegroundColor Cyan
scp -i $KeyPath $ZipFile ${ServerUser}@${ServerIP}:${RemotePath}/client/

# --- 4. EXECUTE REMOTE COMMANDS ---
Write-Host "--- Configuring and Restarting Server ---" -ForegroundColor Cyan

# We define the commands as a single line separated by semicolons 
# This prevents Windows from adding \r (Carriage Returns) at the end of lines
$Cmd1 = "cd ${RemotePath}/client"
$Cmd2 = "unzip -o jukebox_deploy.zip && rm jukebox_deploy.zip"
$Cmd3 = "echo 'SPOTIFY_CLIENT_ID=3c5e00fa03dc46109048d2905f87332e' > ${RemotePath}/.env"
$Cmd4 = "echo 'SPOTIFY_CLIENT_SECRET=0035087b530a4a30a447a280cbb9b9fd' >> ${RemotePath}/.env"
$Cmd5 = "echo 'REDIRECT_URI=https://${Domain}/api/callback' >> ${RemotePath}/.env"
$Cmd6 = "echo 'PORT=8888' >> ${RemotePath}/.env"
$Cmd7 = "echo 'FRONTEND_URL=https://${Domain}' >> ${RemotePath}/.env"
$Cmd8 = "sudo chown -R ${ServerUser}:${ServerUser} ${RemotePath}"
$Cmd9 = "npm install --production --legacy-peer-deps"
$Cmd10 = "pm2 restart all"

# Combine them all into one string
$FullRemoteCmd = "$Cmd1; $Cmd2; $Cmd3; $Cmd4; $Cmd5; $Cmd6; $Cmd7; $Cmd8; $Cmd9; $Cmd10"

ssh -i $KeyPath ${ServerUser}@${ServerIP} $FullRemoteCmd

Write-Host "--- Deployment Successful ---" -ForegroundColor Green
Start-Process "https://$Domain"