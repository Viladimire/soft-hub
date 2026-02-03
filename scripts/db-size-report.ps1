param(
  [string]$DbUrl
)

if (-not $DbUrl) {
  $DbUrl = Read-Host "Enter SUPABASE_DB_URL (postgres://...)"
}

if (-not $DbUrl) {
  Write-Error "SUPABASE_DB_URL is required"
  exit 1
}

$env:SUPABASE_DB_URL = $DbUrl
node scripts/db-size-report.mjs
