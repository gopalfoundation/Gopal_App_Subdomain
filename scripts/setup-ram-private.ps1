param([string]$Origin = 'http://127.0.0.1:4321')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root '.env.local'
if (Test-Path -LiteralPath $target) { throw 'Private configuration already exists. Edit it privately instead of overwriting it.' }
$endpoint = Read-Host 'Apps Script deployment URL (leave blank if not deployed yet)'
if ($endpoint -and $endpoint -notmatch '^https://script\.google\.com/macros/s/[\w-]+/exec$') { throw 'Please enter a valid Apps Script deployment URL.' }
$password = Read-Host 'Choose the SITA RAM portal password (at least 12 characters)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ($plain.Length -lt 12) { throw 'Use at least 12 characters.' }
  $info = New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName = (Get-Command node).Source
  $info.WorkingDirectory = $root
  $info.Arguments = 'scripts/create-admin-credentials.mjs'
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  $info.RedirectStandardInput = $true
  $info.RedirectStandardOutput = $true
  $process = [System.Diagnostics.Process]::Start($info)
  $process.StandardInput.Write($plain)
  $process.StandardInput.Close()
  $private = $process.StandardOutput.ReadToEnd() | ConvertFrom-Json
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) { throw 'Unable to create password hash.' }
  @("SITE_ORIGIN=$Origin", "REGISTRATION_BACKEND_URL=$endpoint", "REGISTRATION_BACKEND_SECRET=$($private.backendToken)", "ADMIN_PASSWORD_HASH=$($private.passwordHash)", "ADMIN_SESSION_SECRET=$($private.sessionSecret)") | Set-Content -LiteralPath $target -Encoding utf8
  Write-Host 'Private .env.local created. Your portal password is ready. Follow REGISTRATION-BACKEND-SETUP.md to connect Google.'
  Write-Host 'REGISTRATION_BACKEND_SECRET is in .env.local. Transfer it privately to Apps Script properties; never paste secrets in chat.'
} finally {
  $plain = $null
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $password.Dispose()
}
