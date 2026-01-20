param(
    [switch]$Force,
    [string]$SupabaseUrl,
    [string]$SupabaseAnonKey,
    [string]$SupabaseServiceRoleKey,
    [string]$SupabaseDbHost,
    [string]$SupabaseDbName,
    [string]$SupabaseDbUser,
    [string]$SupabaseDbPassword
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..")
$envFile = Join-Path $projectRoot ".env.local"

if ((Test-Path $envFile) -and -not $Force) {
    Write-Host "⚠️  ملف .env.local موجود بالفعل." -ForegroundColor Yellow
    $choice = Read-Host "هل ترغب في استبداله؟ (y/N)"
    if ($choice.ToLower() -ne "y") {
        Write-Host "تم الإلغاء بناءً على اختيارك." -ForegroundColor Yellow
        exit 0
    }
}

function Read-SupabaseValue {
    param(
        [string]$Prompt,
        [bool]$Optional = $false
    )

    while ($true) {
        $value = Read-Host $Prompt
        if (-not $Optional -and [string]::IsNullOrWhiteSpace($value)) {
            Write-Host "القيمة مطلوبة، حاول مرة أخرى." -ForegroundColor Red
            continue
        }
        return $value.Trim()
    }
}

$supabaseUrl = if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) {
    Read-SupabaseValue -Prompt "أدخل قيمة NEXT_PUBLIC_SUPABASE_URL (مثال: https://xyzcompany.supabase.co)"
} else {
    $SupabaseUrl.Trim()
}

$anonKey = if ([string]::IsNullOrWhiteSpace($SupabaseAnonKey)) {
    Read-SupabaseValue -Prompt "أدخل قيمة NEXT_PUBLIC_SUPABASE_ANON_KEY"
} else {
    $SupabaseAnonKey.Trim()
}

$serviceRoleKey = if ([string]::IsNullOrWhiteSpace($SupabaseServiceRoleKey)) {
    Read-SupabaseValue -Prompt "أدخل قيمة SUPABASE_SERVICE_ROLE_KEY (اتركه فارغًا إن لم يكن متاحًا)" -Optional $true
} else {
    $SupabaseServiceRoleKey.Trim()
}

$dbHost = if ([string]::IsNullOrWhiteSpace($SupabaseDbHost)) {
    $null
} else {
    $SupabaseDbHost.Trim()
}

$dbName = if ([string]::IsNullOrWhiteSpace($SupabaseDbName)) {
    $null
} else {
    $SupabaseDbName.Trim()
}

$dbUser = if ([string]::IsNullOrWhiteSpace($SupabaseDbUser)) {
    $null
} else {
    $SupabaseDbUser.Trim()
}

$dbPassword = if ([string]::IsNullOrWhiteSpace($SupabaseDbPassword)) {
    $null
} else {
    $SupabaseDbPassword.Trim()
}

$envContent = @()
$envContent += "NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl"
$envContent += "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey"
if (-not [string]::IsNullOrWhiteSpace($serviceRoleKey)) {
    $envContent += "SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey"
}

if ($dbHost) {
    $envContent += "SUPABASE_DB_HOST=$dbHost"
}
if ($dbName) {
    $envContent += "SUPABASE_DB_NAME=$dbName"
}
if ($dbUser) {
    $envContent += "SUPABASE_DB_USER=$dbUser"
}
if ($dbPassword) {
    $envContent += "SUPABASE_DB_PASSWORD=$dbPassword"
}

Set-Content -Path $envFile -Value $envContent -Encoding UTF8
Write-Host "✅ تم إنشاء/تحديث .env.local بنجاح في المسار: $envFile" -ForegroundColor Green

$testScript = Join-Path $scriptDir "test-supabase-connection.mjs"
if (Test-Path $testScript) {
    Write-Host "🔄 يتم الآن اختبار الاتصال بـ Supabase ..." -ForegroundColor Cyan
    try {
        & node $testScript
    }
    catch {
        Write-Host "تعذر تشغيل اختبار الاتصال. تأكد من تثبيت Node.js والأمر 'node'." -ForegroundColor Yellow
    }
}
else {
    Write-Host "ℹ️ لم يتم العثور على test-supabase-connection.mjs. يمكنك تشغيل الاختبار لاحقًا بعد إنشائه." -ForegroundColor Yellow
}
