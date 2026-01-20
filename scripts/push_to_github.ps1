Param(
    [Parameter(Mandatory = $true)]
    [string]$GitHubToken,

    [Parameter(Mandatory = $true)]
    [string]$RepoOwner,

    [Parameter(Mandatory = $true)]
    [string]$Repository,

    [Parameter(Mandatory = $false)]
    [string]$Branch = "main",

    [Parameter(Mandatory = $false)]
    [string]$CommitMessage = "chore: sync project",

    [Parameter(Mandatory = $false)]
    [bool]$PrivateRepo = $false,

    [Parameter(Mandatory = $false)]
    [string]$GitUserName,

    [Parameter(Mandatory = $false)]
    [string]$GitUserEmail
)

$ErrorActionPreference = "Stop"

function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Cyan
}

function Write-WarningMessage($message) {
    Write-Warning "[WARN] $message"
}

function Invoke-GitHubApi {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $false)]$Body
    )

    $headers = @{
        "Accept"             = "application/vnd.github+json"
        "Authorization"      = "Bearer $GitHubToken"
        "X-GitHub-Api-Version" = "2022-11-28"
    }

    if ($null -ne $Body) {
        $jsonBody = $Body | ConvertTo-Json -Depth 10
        return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $jsonBody -ContentType "application/json"
    }

    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

function Run-Git {
    param(
        [string[]]$Arguments,
        [switch]$MaskToken
    )

    $display = $Arguments -join ' '
    if ($MaskToken) {
        $display = $display.Replace($GitHubToken, '***')
    }

    Write-Info "git $display"
    $process = Start-Process -FilePath "git" -ArgumentList $Arguments -WorkingDirectory $repoRoot -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "Command failed: git $display"
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
    Write-Info "Working directory set to $repoRoot"

    if (-not (Test-Path "$repoRoot\package.json")) {
        throw "package.json غير موجود في $repoRoot. تأكد من تشغيل السكربت من مجلد المشروع."
    }

    $authUser = Invoke-GitHubApi -Method "GET" -Url "https://api.github.com/user"
    if (-not $RepoOwner) {
        $RepoOwner = $authUser.login
        Write-Info "استخدام مالك المستودع الافتراضي: $RepoOwner"
    }

    $repoApiUrl = "https://api.github.com/repos/$RepoOwner/$Repository"

    try {
        Invoke-GitHubApi -Method "GET" -Url $repoApiUrl | Out-Null
        Write-Info "المستودع $Repository موجود مسبقًا."
    } catch {
        $response = $_.Exception.Response
        $statusCode = $null
        if ($response -and $response.PSObject.Properties.Name -contains 'StatusCode') {
            $statusCode = [int]$response.StatusCode
        }

        if ($statusCode -eq 404) {
            Write-Info "إنشاء مستودع جديد باسم $Repository"
            $createBody = @{
                name        = $Repository
                private     = $PrivateRepo
                description = "Repository for $RepoOwner/$Repository"
            }

            if ($RepoOwner -eq $authUser.login) {
                Invoke-GitHubApi -Method "POST" -Url "https://api.github.com/user/repos" -Body $createBody | Out-Null
            } else {
                Invoke-GitHubApi -Method "POST" -Url "https://api.github.com/orgs/$RepoOwner/repos" -Body $createBody | Out-Null
            }

            Write-Info "تم إنشاء المستودع بنجاح."
        } else {
            throw
        }
    }

    if (-not (Test-Path "$repoRoot\.git")) {
        Write-Info "Initialising git repository"
        Run-Git @('init')
    }

    if ($GitUserName) {
        Run-Git @('config', 'user.name', $GitUserName)
    }

    if ($GitUserEmail) {
        Run-Git @('config', 'user.email', $GitUserEmail)
    }

    Run-Git @('checkout', '-B', $Branch)
    Run-Git @('add', '-A')

    $changes = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($changes)) {
        Write-Info "لا توجد تغييرات جديدة للالتزام."
    } else {
        $quotedMessage = '"' + $CommitMessage + '"'
        Run-Git @('commit', '-m', $quotedMessage)
    }

    $remoteUrl = "https://github.com/$RepoOwner/$Repository.git"
    try {
        $currentRemote = git remote get-url origin
    } catch {
        $currentRemote = $null
    }

    if (-not $currentRemote) {
        Write-Info "إضافة remote origin الجديد"
        Run-Git @('remote', 'add', 'origin', $remoteUrl)
    } elseif ($currentRemote.Trim() -ne $remoteUrl) {
        Write-Info "تحديث عنوان remote origin"
        Run-Git @('remote', 'set-url', 'origin', $remoteUrl)
    } else {
        Write-Info "remote origin مضبوط مسبقًا على $remoteUrl"
    }

    $previousExtraHeader = $env:GIT_HTTP_EXTRAHEADER
    $env:GIT_HTTP_EXTRAHEADER = "Authorization: Bearer $GitHubToken"

    try {
        Run-Git @('push', '--set-upstream', 'origin', $Branch) -MaskToken
    } finally {
        if ($null -eq $previousExtraHeader) {
            Remove-Item Env:GIT_HTTP_EXTRAHEADER -ErrorAction SilentlyContinue
        } else {
            $env:GIT_HTTP_EXTRAHEADER = $previousExtraHeader
        }
    }

    Write-Info "تم الدفع إلى GitHub بنجاح."
}
finally {
    Pop-Location
}
