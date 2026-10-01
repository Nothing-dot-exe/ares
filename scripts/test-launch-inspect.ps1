$ErrorActionPreference = 'Stop'
$output = & powershell -ExecutionPolicy Bypass -File .agents\skills\launch\scripts\launch.ps1 --session-title 'inspect-chat' --skip-prelaunch
$jsonLine = $output | Select-Object -Last 1
Write-Host "LAUNCH_RESULT:$jsonLine"

$launchInfo = $jsonLine | ConvertFrom-Json
$cdpPort = $launchInfo.cdpPort
$appPid = $launchInfo.pid

Write-Host "Running inspection on port $cdpPort..."
$inspectResult = & node scripts/inspect-chat-panel.mjs $cdpPort
Write-Host "INSPECT_OUTPUT:"
Write-Host $inspectResult

Write-Host "Cleaning up test process PID $appPid..."
try {
    Stop-Process -Id $appPid -Force -ErrorAction SilentlyContinue
} catch {}
