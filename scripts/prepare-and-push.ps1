Param(
    [Parameter(Mandatory = $false)]
    [string]$RemoteUrl,

    [Parameter(Mandatory = $false)]
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Cyan
}

function Write-WarningMessage($message) {
    Write-Warning "[WARN] $message"
}

function Run-Step([string]$command, [string]$workingDir) {
    Write-Info "Running: $command"
    $process = Start-Process -FilePath "pwsh" -ArgumentList "-NoProfile", "-Command", $command -WorkingDirectory $workingDir -NoNewWindow -PassThru -Wait
    if ($process.ExitCode -ne 0) {
        throw "Command failed: $command"
    }
}

$repoRoot = Convert-Path "."
Write-Info "Repository root detected at $repoRoot"

if (-not (Test-Path "$repoRoot\package.json")) {
    throw "Could not find package.json in $repoRoot. Please run this script from the project root."
}

Run-Step "npm install" $repoRoot
Run-Step "npm run build" $repoRoot

if (-not (Test-Path "$repoRoot\.git")) {
    Write-Info "Initialising git repository"
    Run-Step "git init" $repoRoot
}

Run-Step "git checkout -B $Branch" $repoRoot

Run-Step "git add ." $repoRoot

$changes = (git status --porcelain)
if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Info "No changes to commit."
} else {
    Write-Info "Creating commit"
    try {
        Run-Step "git commit -m 'chore: prepare release'" $repoRoot
    } catch {
        Write-WarningMessage "Commit failed. Ensure git user.name and user.email are configured."
        throw
    }
}

if ($RemoteUrl) {
    Write-Info "Configuring remote origin to $RemoteUrl"
    $hasRemote = git remote | Select-String -SimpleMatch "origin"
    if ($hasRemote) {
        Run-Step "git remote set-url origin $RemoteUrl" $repoRoot
    } else {
        Run-Step "git remote add origin $RemoteUrl" $repoRoot
    }

    try {
        Run-Step "git push -u origin $Branch" $repoRoot
    } catch {
        Write-WarningMessage "Push failed. Please verify credentials and remote access."
        throw
    }
} else {
    Write-WarningMessage "Remote URL not provided. Skipping push."
}

Write-Info "All steps completed successfully."
