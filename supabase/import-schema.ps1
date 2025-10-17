<#
PowerShell helper to import supabase/schema.sql into your Supabase Postgres DB.
Requires `psql` available on PATH (from PostgreSQL client).

Usage:
  # Option A: use env var
  $env:SUPABASE_DB_URL = 'postgresql://postgres:password@db.host:5432/postgres'
  .\import-schema.ps1

  # Option B: pass as parameter
  .\import-schema.ps1 -DatabaseUrl "postgresql://postgres:password@db.host:5432/postgres"

Note: Use the connection string from Supabase dashboard -> Settings -> Database -> Connection string (use the "Connection string (URI)" value).
Do NOT share that connection string publicly (it contains your database credentials).
#>
[CmdletBinding()]
param(
    [string]$DatabaseUrl
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$schemaPath = Join-Path $scriptDir 'schema.sql'

if (-not (Test-Path $schemaPath)) {
    Write-Error "schema.sql not found at $schemaPath"
    exit 1
}

if (-not $DatabaseUrl) {
    $DatabaseUrl = $env:SUPABASE_DB_URL
}

if (-not $DatabaseUrl) {
    Write-Host 'No database URL provided. Paste the Postgres connection URI from Supabase (format: postgresql://user:pass@host:port/db):'
    $DatabaseUrl = Read-Host -Prompt 'Database URL'
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Error 'psql was not found on PATH. Please install PostgreSQL client tools or add psql to PATH.'
    exit 1
}

Write-Host "Importing schema from $schemaPath into $DatabaseUrl ..."

# Run psql and stop on first error
$psqlArgs = @(
    $DatabaseUrl,
    '-v', 'ON_ERROR_STOP=1',
    '-f', $schemaPath
)

$proc = Start-Process -FilePath 'psql' -ArgumentList $psqlArgs -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -ne 0) {
    Write-Error "psql exited with code $($proc.ExitCode). Check the output above for errors."
    exit $proc.ExitCode
}

Write-Host 'Schema import completed successfully.' -ForegroundColor Green
