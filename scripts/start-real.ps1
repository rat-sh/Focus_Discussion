param(
  [ValidateSet('All', 'Api', 'Web')]
  [string]$Role = 'All'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

if ($Role -eq 'Api') {
  & bun run dev:api
  exit $LASTEXITCODE
}

if ($Role -eq 'Web') {
  $env:VITE_USE_MOCK = 'false'
  & bun run dev
  exit $LASTEXITCODE
}

function Read-EnvFile([string]$Path) {
  if (-not (Test-Path $Path)) {
    throw "Missing $Path. Create it from its .env.example file and fill in your real service settings."
  }

  $result = @{}
  foreach ($line in Get-Content $Path) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $result[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
    }
  }
  return $result
}

$configurationErrors = [System.Collections.Generic.List[string]]::new()

function Require-ConfiguredValue([hashtable]$Values, [string]$Name, [string]$File, [bool]$AllowLocal = $false) {
  $value = $Values[$Name]
  $isPlaceholder = [string]::IsNullOrWhiteSpace($value) -or $value -match 'YOUR_|your_'
  $isLocal = $value -match '127\.0\.0\.1|localhost|::1'
  if ($isPlaceholder -or ($isLocal -and -not $AllowLocal)) {
    $configurationErrors.Add("$Name in $File")
  }
}

function Read-SecureValue([string]$Prompt) {
  $secureValue = Read-Host $Prompt -AsSecureString
  if ($secureValue.Length -eq 0) {
    throw 'A required value was not entered.'
  }
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secureValue.Dispose()
  }
}

function Set-EnvValue([string]$Path, [string]$Name, [string]$Value) {
  $content = [IO.File]::ReadAllText((Resolve-Path $Path))
  $pattern = '(?m)^\s*' + [regex]::Escape($Name) + '\s*=.*$'
  $replacement = "$Name=$Value"
  if ([regex]::IsMatch($content, $pattern)) {
    $content = [regex]::Replace($content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $replacement })
  } else {
    $content = $content.TrimEnd("`r", "`n") + "`r`n$replacement`r`n"
  }
  [IO.File]::WriteAllText((Resolve-Path $Path), $content, [Text.UTF8Encoding]::new($false))
}

$clientEnv = Read-EnvFile '.env.local'
$serverEnv = Read-EnvFile 'server/.env'

if ($clientEnv['VITE_USE_MOCK'] -ne 'false') {
  Set-EnvValue '.env.local' 'VITE_USE_MOCK' 'false'
  $clientEnv['VITE_USE_MOCK'] = 'false'
}

$missingClientValues = @('VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY') |
  Where-Object { [string]::IsNullOrWhiteSpace($clientEnv[$_]) -or $clientEnv[$_] -match 'YOUR_|your_' }
if ($missingClientValues.Count -gt 0) {
  Write-Host "Configure these values in .env.local first: $($missingClientValues -join ', ')"
  Write-Host 'They are the Supabase project URL and anon/public key (not the service-role key).'
  exit 1
}

$databaseMissing = @('DATABASE_URL', 'DATABASE_URL_ADMIN') |
  Where-Object { [string]::IsNullOrWhiteSpace($serverEnv[$_]) -or $serverEnv[$_] -match 'YOUR_|your_|127\.0\.0\.1|localhost|::1' }
$valkeyMissing = [string]::IsNullOrWhiteSpace($serverEnv['VALKEY_URL']) -or $serverEnv['VALKEY_URL'] -match 'YOUR_|your_'
if ($valkeyMissing) {
  Set-EnvValue 'server/.env' 'VALKEY_URL' 'redis://127.0.0.1:6379'
  $serverEnv['VALKEY_URL'] = 'redis://127.0.0.1:6379'
}
$valkeyUri = $null
if (-not [Uri]::TryCreate($serverEnv['VALKEY_URL'], [UriKind]::Absolute, [ref]$valkeyUri) -or $valkeyUri.Scheme -notin @('redis', 'rediss')) {
  Write-Host 'VALKEY_URL in server/.env must be a redis:// or rediss:// URL.' -ForegroundColor Yellow
  exit 1
}
$valkeyLocal = $valkeyUri.Host -in @('127.0.0.1', 'localhost', '::1')

if ($databaseMissing.Count -gt 0) {
  $supabaseUrl = $null
  if (-not [Uri]::TryCreate($serverEnv['SUPABASE_URL'], [UriKind]::Absolute, [ref]$supabaseUrl) -or $supabaseUrl.Host -notmatch '^([a-z0-9]+)\.supabase\.co$') {
    Write-Host 'SUPABASE_URL in server/.env is not a valid Supabase project URL.' -ForegroundColor Yellow
    exit 1
  }

  $projectRef = $supabaseUrl.Host.Split('.')[0]
  Write-Host ''
  Write-Host 'Supabase SQL is already applied; this only saves the app database connection locally.'
  Write-Host 'Enter the NEW database password after resetting the exposed one. Input is hidden.'
  $databasePassword = Read-SecureValue 'New Supabase database password'
  $encodedPassword = [Uri]::EscapeDataString($databasePassword)
  $databaseUrl = "postgresql://postgres:$encodedPassword@db.$projectRef.supabase.co:5432/postgres?sslmode=require"
  Set-EnvValue 'server/.env' 'DATABASE_URL' $databaseUrl
  Set-EnvValue 'server/.env' 'DATABASE_URL_ADMIN' $databaseUrl
  $serverEnv['DATABASE_URL'] = $databaseUrl
  $serverEnv['DATABASE_URL_ADMIN'] = $databaseUrl
  $databasePassword = $null
  $encodedPassword = $null
}

foreach ($name in @(
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'LIVEKIT_URL',
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET'
  )) {
  Require-ConfiguredValue $serverEnv $name 'server/.env'
}
if ($configurationErrors.Count -gt 0) {
  Write-Host ''
  Write-Host 'Focus Lock real mode is not configured yet.' -ForegroundColor Yellow
  Write-Host "Missing or sample settings: $($configurationErrors -join ', ')."
  Write-Host ''
  Write-Host 'Fix those settings in server/.env, then run bun run start:real again.'
  exit 1
}

foreach ($port in @(5173, 8787)) {
  $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($listener) {
    throw "Port $port is already in use. Stop the existing Focus Lock process with Ctrl+C before running this command again."
  }
}

Write-Host 'Installing locked project dependencies...'
& bun install --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
  throw 'Dependency installation failed.'
}

if ($valkeyLocal) {
  $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $dockerCommand) {
    throw 'Docker is not installed. Install Docker Desktop, then run bun run start:real again.'
  }

  $desktopCandidates = @(
    (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Docker\Docker Desktop.exe')
  )
  $dockerDesktop = $desktopCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $dockerDesktop) {
    throw 'Docker CLI is installed, but Docker Desktop is missing. Install Docker Desktop, launch it once, then rerun this command.'
  }

  function Test-DockerEngine([string]$DockerPath) {
    $null = & $DockerPath version --format '{{.Server.Version}}' 2>$null
    return $LASTEXITCODE -eq 0
  }

  if (-not (Test-DockerEngine $dockerCommand.Source)) {
    Write-Host 'Starting Docker Desktop...'
    Start-Process -FilePath $dockerDesktop | Out-Null
    $engineReady = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
      Start-Sleep -Seconds 2
      if (Test-DockerEngine $dockerCommand.Source) {
        $engineReady = $true
        break
      }
    }
    if (-not $engineReady) {
      throw 'Docker Desktop did not become ready within 2 minutes. Open Docker Desktop, wait until it says Running, then rerun bun run start:real.'
    }
  }

  Write-Host 'Starting local Valkey with Docker Compose...'
  & $dockerCommand.Source compose up -d valkey
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker could not start Valkey. Check Docker Desktop and rerun bun run start:real.'
  }

  $valkeyReady = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    $pingOutput = & $dockerCommand.Source compose exec -T valkey valkey-cli ping 2>$null
    if ($LASTEXITCODE -eq 0 -and "$pingOutput".Trim() -eq 'PONG') {
      $valkeyReady = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $valkeyReady) {
    throw 'Valkey container did not become ready. Check Docker Desktop with: docker compose ps'
  }
  Write-Host 'Valkey is running and responding.'
}

function Start-FocusLockTerminal([string]$ChildRole, [string]$Title) {
  $command = "`$host.UI.RawUI.WindowTitle = '$Title'; Set-Location -LiteralPath '$repoRoot'; & '$PSCommandPath' -Role $ChildRole"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit', '-EncodedCommand', $encoded) | Out-Null
}

Write-Host 'Starting the real-mode API and web app in separate PowerShell windows...'
Start-FocusLockTerminal 'Api' 'Focus Lock API'
Start-FocusLockTerminal 'Web' 'Focus Lock Web'
Start-Sleep -Seconds 3

try {
  $ready = Invoke-RestMethod -Uri 'http://localhost:8787/readyz' -TimeoutSec 8
  if ($ready.ok -and $ready.postgres -and $ready.valkey) {
    Write-Host 'API, database, and Valkey are ready.'
  } else {
    Write-Warning "The API started, but dependencies are not ready: $($ready | ConvertTo-Json -Compress). Check server/.env and the API window."
  }
} catch {
  Write-Warning 'The app windows were opened, but API readiness is not confirmed yet. Check the API window and http://localhost:8787/readyz.'
}

Write-Host 'Open http://localhost:5173. Close the API and Web PowerShell windows to stop the app.'
