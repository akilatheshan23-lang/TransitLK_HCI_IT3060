param([switch]$Install)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$bundledRoot = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies'
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $bundledRoot 'node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Install Node.js 22.13+ and pnpm 11.25.0, then run this script again.' }
$env:PATH = (Split-Path $nodePath) + ';' + $env:PATH
if ($Install) {
  $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
  Push-Location $projectRoot
  try {
    if ($pnpmCommand) { & $pnpmCommand.Source install }
    else { & $nodePath (Join-Path $bundledRoot 'node/node_modules/pnpm/bin/pnpm.cjs') install }
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
  } finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $projectRoot 'node_modules/expo'))) { throw 'Run ./start-local.ps1 -Install first.' }
if (-not (Test-Path (Join-Path $projectRoot 'backend/.env'))) { throw 'Copy backend/.env.example to backend/.env and configure MongoDB first.' }
$runtimeDirectory = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Force $runtimeDirectory | Out-Null
$env:EXPO_NO_TELEMETRY = '1'
$env:__UNSAFE_EXPO_HOME_DIRECTORY = Join-Path $runtimeDirectory 'expo'
foreach ($servicePort in @(4000,8081)) {
  if (Get-NetTCPConnection -State Listen -LocalPort $servicePort -ErrorAction SilentlyContinue) { throw "Port $servicePort is already in use. Use the running service or stop it before starting another." }
}
$apiProcess = Start-Process -FilePath $nodePath -ArgumentList '--env-file=.env','src/server.js' -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDirectory 'api.log') -RedirectStandardError (Join-Path $runtimeDirectory 'api-error.log') -PassThru
$webProcess = Start-Process -FilePath $nodePath -ArgumentList '../node_modules/expo/bin/cli','start','--web','--port','8081','--max-workers','0' -WorkingDirectory (Join-Path $projectRoot 'mobile') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDirectory 'web.log') -RedirectStandardError (Join-Path $runtimeDirectory 'web-error.log') -PassThru
Write-Host "API process: $($apiProcess.Id). Web process: $($webProcess.Id)."
Write-Host 'Open http://localhost:8081. Logs are in .local/. Stop these processes when finished.'
