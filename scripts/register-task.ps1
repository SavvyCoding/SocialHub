# Run this script ONCE as Administrator to register the daily pipeline task
# Right-click PowerShell → "Run as Administrator", then:
#   cd C:\Users\digvi\Personal\social-platform\scripts
#   .\register-task.ps1

$TaskName    = "SocialPlatform-DailyPipeline"
$BatFile     = "C:\Users\digvi\Personal\social-platform\scripts\daily-pipeline.bat"
$RunAt       = "00:00"   # Change to your preferred time (24h format, local time)
$User        = $env:USERNAME

# Remove existing task if present
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$Action  = New-ScheduledTaskAction -Execute $BatFile
$Trigger = New-ScheduledTaskTrigger -Daily -At $RunAt
$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 4) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -DontStopIfGoingOnBatteries `
    -WakeToRun:$false

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action   $Action `
    -Trigger  $Trigger `
    -Settings $Settings `
    -RunLevel Highest `
    -Force

Write-Host ""
Write-Host "Task '$TaskName' registered — runs daily at $RunAt local time." -ForegroundColor Green
Write-Host ""
Write-Host "To run it right now (for testing):"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "To check status:"
Write-Host "  Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
Write-Host ""
Write-Host "To unregister:"
Write-Host "  Unregister-ScheduledTask -TaskName '$TaskName'"
