<#
PowerShell helper to call the export server and save the ZIP.
Usage:
  .\scripts\export.ps1 -StartDate 2025-10-01 -EndDate 2025-10-21 -Out export.zip
If no dates provided, the script will omit them.
#>
param(
    [string]$StartDate,
    [string]$EndDate,
    [string]$Out = "export.zip",
    [string]$Url = "http://localhost:3000/api/export-laborator"
)

$payload = @{}
if ($StartDate) { $payload.startDate = $StartDate }
if ($EndDate)   { $payload.endDate = $EndDate }

$json = ConvertTo-Json $payload -Depth 5

Write-Host "Calling $Url -> $Out"

# Prefer Invoke-RestMethod (native PS) because it handles JSON easily and returns binary with -OutFile
try {
    # Use Invoke-WebRequest to capture binary response directly
    Invoke-WebRequest -Uri $Url -Method Post -ContentType 'application/json' -Body $json -OutFile $Out -ErrorAction Stop
    Write-Host "Wrote $Out"
    exit 0
} catch {
    Write-Warning "Invoke-WebRequest failed: $_. Trying curl.exe fallback..."
}

# Fallback to curl: write payload to a temp file and call curl.exe with -d @file to avoid quoting issues
$temp = [System.IO.Path]::GetTempFileName()
try {
    Set-Content -Path $temp -Value $json -Encoding UTF8
    $curlCmd = (Get-Command curl.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
    if (-not $curlCmd) {
        Write-Error "curl.exe not found and Invoke-WebRequest failed. Cannot perform fallback."
        Remove-Item -Path $temp -ErrorAction SilentlyContinue
        exit 2
    }

    & $curlCmd -s -S -H "Content-Type: application/json" -d "@$temp" $Url --output $Out
    $exit = $LASTEXITCODE
    Remove-Item -Path $temp -ErrorAction SilentlyContinue
    if ($exit -eq 0) {
        Write-Host "Wrote $Out (curl)"
        exit 0
    } else {
        Write-Error "curl.exe failed with exit code $exit"
        exit $exit
    }
} catch {
    Remove-Item -Path $temp -ErrorAction SilentlyContinue
    Write-Error "Fallback to curl failed: $_"
    exit 3
}
