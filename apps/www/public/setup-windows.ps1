#Requires -Version 5.1
<#
.SYNOPSIS
    Locus Development Environment Setup (Windows)
    Provisions a Windows machine with everything needed to run Locus.

.DESCRIPTION
    Usage (interactive):
      irm https://locusai.dev/setup-windows.ps1 | iex

    Usage (non-interactive):
      irm https://locusai.dev/install.ps1 | iex
      # Or run directly with flags:
      .\setup-windows.ps1 `
        -Repo "https://github.com/user/project.git" `
        -GhToken "ghp_..." `
        -Branch "main"
#>

param(
    [string]$Repo = "",
    [string]$Branch = "main",
    [string]$GhToken = "",
    [string]$Dir = ""
)

$ErrorActionPreference = "Stop"

# ─── Colors & Output ──────────────────────────────────────────────────────────

function Write-Info    { param([string]$Message) Write-Host "  i  $Message" -ForegroundColor Blue }
function Write-Success { param([string]$Message) Write-Host "  +  $Message" -ForegroundColor Green }
function Write-Warn    { param([string]$Message) Write-Host "  !  $Message" -ForegroundColor Yellow }
function Write-Err     { param([string]$Message) Write-Host "  x  $Message" -ForegroundColor Red }
function Write-Header  { param([string]$Message) Write-Host "`n  -- $Message --`n" -ForegroundColor Cyan }

# ─── Platform Check ──────────────────────────────────────────────────────────

if ($env:OS -ne "Windows_NT") {
    Write-Err "This script is designed for Windows. Use https://locusai.dev/install.sh for macOS/Linux."
    exit 1
}

# ─── Interactive Mode ────────────────────────────────────────────────────────

function Read-Prompt {
    param(
        [string]$Label,
        [bool]$Required = $false,
        [string]$Default = ""
    )

    $suffix = ""
    if ($Default) {
        $suffix = " (default: $Default)"
    } elseif ($Required) {
        $suffix = " (required)"
    } else {
        $suffix = " (optional, press Enter to skip)"
    }

    while ($true) {
        $value = Read-Host "  $Label$suffix"
        $value = $value.Trim()

        if (-not $value -and $Default) {
            $value = $Default
        }

        if ($Required -and -not $value) {
            Write-Err "This field is required. Please enter a value."
            continue
        }

        return $value
    }
}

if (-not $Repo) {
    Write-Host ""
    Write-Host "  Interactive Setup" -ForegroundColor White
    Write-Host "  Paste your values below. Press Enter to skip optional fields." -ForegroundColor DarkGray
    Write-Host ""

    $Repo           = Read-Prompt -Label "Repository HTTPS URL (e.g. https://github.com/user/repo.git)" -Required $true
    $Branch         = Read-Prompt -Label "Branch" -Default "main"
    $GhToken        = Read-Prompt -Label "GitHub Token"

    Write-Host ""
}

# ─── Validate Repository URL ─────────────────────────────────────────────────

if ($Repo -match "^git@" -or $Repo -match "^ssh://") {
    Write-Err "SSH repository URLs are not supported. Please use an HTTPS URL."
    Write-Err "Example: https://github.com/user/repo.git"
    exit 1
}

# ─── Banner ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  +===============================================+" -ForegroundColor Cyan
Write-Host "  |         Locus Environment Setup (Windows)     |" -ForegroundColor Cyan
Write-Host "  |         GitHub-Native AI Sprint Execution     |" -ForegroundColor Cyan
Write-Host "  +===============================================+" -ForegroundColor Cyan
Write-Host ""

Write-Info "Repository:     $Repo"
Write-Info "Branch:         $Branch"
Write-Info "User:           $env:USERNAME"
$ghTokenStatus = if ($GhToken) { "configured" } else { "not set" }
Write-Info "GH Token:       $ghTokenStatus"
Write-Host ""

# ─── Helper: Check if command exists ─────────────────────────────────────────

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

# ─── Helper: Refresh PATH from registry ──────────────────────────────────────

function Update-SessionPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path    = "$machinePath;$userPath"
}

# ─── Step 1: Git ─────────────────────────────────────────────────────────────

Write-Header "Git"

if (Test-Command "git") {
    Write-Success "Git already installed: $(git --version)"
} else {
    if (Test-Command "winget") {
        Write-Info "Installing Git via winget..."
        winget install --id Git.Git --accept-source-agreements --accept-package-agreements --silent
        Update-SessionPath
        Write-Success "Git installed: $(git --version)"
    } else {
        Write-Err "Git is not installed and winget is not available."
        Write-Err "Please install Git from https://git-scm.com/download/win and re-run this script."
        exit 1
    }
}

# ─── Step 2: GitHub CLI (gh) ─────────────────────────────────────────────────

Write-Header "GitHub CLI"

if (Test-Command "gh") {
    Write-Success "GitHub CLI already installed: $(gh --version | Select-Object -First 1)"
} else {
    if (Test-Command "winget") {
        Write-Info "Installing GitHub CLI via winget..."
        winget install --id GitHub.cli --accept-source-agreements --accept-package-agreements --silent
        Update-SessionPath
        Write-Success "GitHub CLI installed: $(gh --version | Select-Object -First 1)"
    } else {
        Write-Warn "winget not available. Please install GitHub CLI from https://cli.github.com/"
        Write-Warn "Continuing without GitHub CLI..."
    }
}

# Authenticate gh if token provided
if ($GhToken -and (Test-Command "gh")) {
    Write-Info "Authenticating GitHub CLI..."
    $GhToken | gh auth login --with-token --hostname github.com --git-protocol https
    $ghStatus = gh auth status --hostname github.com 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "GitHub CLI authenticated"
        gh auth setup-git
        Write-Success "Git credential helper configured (via gh)"
    } else {
        Write-Warn "GitHub CLI authentication failed -- verify your token is valid"
    }
}

# ─── Step 3: Node.js 22+ ────────────────────────────────────────────────────

Write-Header "Node.js"

$RequiredNodeMajor = 22
$InstallNode = $true

if (Test-Command "node") {
    $currentNode = [int]((node -v) -replace 'v(\d+)\..*', '$1')
    if ($currentNode -ge $RequiredNodeMajor) {
        Write-Success "Node.js already installed: $(node -v)"
        $InstallNode = $false
    } else {
        Write-Warn "Node.js $(node -v) found but need v${RequiredNodeMajor}+. Installing..."
    }
}

if ($InstallNode) {
    if (Test-Command "winget") {
        Write-Info "Installing Node.js $RequiredNodeMajor via winget..."
        winget install --id OpenJS.NodeJS --version-match "$RequiredNodeMajor\." --accept-source-agreements --accept-package-agreements --silent
        Update-SessionPath
        Write-Success "Node.js installed: $(node -v)"
    } else {
        Write-Err "Node.js $RequiredNodeMajor+ is required but winget is not available."
        Write-Err "Please install Node.js from https://nodejs.org/ and re-run this script."
        exit 1
    }
}

Write-Success "npm version: $(npm -v)"

# ─── Step 4: Bun ────────────────────────────────────────────────────────────

Write-Header "Bun"

if (Test-Command "bun") {
    Write-Success "Bun already installed: $(bun --version)"
} else {
    Write-Info "Installing Bun..."
    irm https://bun.sh/install.ps1 | iex

    $bunPath = Join-Path $env:USERPROFILE ".bun\bin"
    if (Test-Path $bunPath) {
        $env:Path = "$bunPath;$env:Path"
        $currentUserPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentUserPath -notlike "*$bunPath*") {
            [System.Environment]::SetEnvironmentVariable("Path", "$bunPath;$currentUserPath", "User")
        }
    }

    Write-Success "Bun installed: $(bun --version)"
}

# ─── Step 5: Claude Code CLI ────────────────────────────────────────────────

Write-Header "Claude Code"

if (Test-Command "claude") {
    Write-Success "Claude Code already installed"
} else {
    Write-Info "Installing Claude Code via npm..."
    npm install -g @anthropic-ai/claude-code 2>$null

    if (Test-Command "claude") {
        Write-Success "Claude Code installed"
    } else {
        Write-Warn "Claude Code installation via npm did not succeed."
        Write-Warn "Install manually: npm install -g @anthropic-ai/claude-code"
    }
}

Write-Info "Configure Claude Code / Codex authentication separately after setup"
Write-Info "  Claude: claude login"
Write-Info "  Codex:  Follow OpenAI Codex setup instructions"

# ─── Step 6: Locus CLI ──────────────────────────────────────────────────────

Write-Header "Locus CLI"

if (Test-Command "locus") {
    $locusVersion = try { locus --version 2>$null } catch { "installed" }
    Write-Success "Locus CLI already installed: $locusVersion"
} else {
    Write-Info "Installing Locus CLI from npm..."
    npm install -g @locusai/cli 2>$null
    Write-Success "Locus CLI installed"
}

# ─── Step 7: Clone Repository ───────────────────────────────────────────────

Write-Header "Repository"

if (-not $Dir) {
    $repoName = [System.IO.Path]::GetFileNameWithoutExtension($Repo.TrimEnd('/').Split('/')[-1])
    $Dir = Join-Path (Get-Location) $repoName
}

if (Test-Path (Join-Path $Dir ".git")) {
    Write-Info "Repository already exists at $Dir"
    Write-Info "Pulling latest changes..."
    Push-Location $Dir
    git fetch origin
    git checkout $Branch 2>$null
    git pull origin $Branch 2>$null
    Pop-Location
    Write-Success "Repository updated"
} else {
    Write-Info "Cloning $Repo (branch: $Branch)..."

    git clone --branch $Branch $Repo $Dir
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Repository cloned to $Dir"
    } else {
        Write-Err "Failed to clone repository."
        if ($GhToken) {
            Write-Err "gh auth is configured but clone failed -- verify the token has repo access."
        } else {
            Write-Err "Provide -GhToken for HTTPS authentication."
        }
        exit 1
    }
}

# ─── Step 8: Initialize Locus ─────────────────────────────────────────────

Write-Header "Locus Init"

Write-Info "Initializing Locus in project..."
Push-Location $Dir
locus init
Pop-Location
Write-Success "Locus initialized"

# ─── Step 9: Verify Installation ───────────────────────────────────────────

Write-Header "Verification"

$checks = @()
$fails = 0

function Test-Check {
    param(
        [string]$Name,
        [scriptblock]$Test
    )

    try {
        $result = & $Test 2>$null
        if ($result -or $LASTEXITCODE -eq 0) {
            Write-Success $Name
            $script:checks += "+ $Name"
        } else {
            throw "check failed"
        }
    } catch {
        Write-Err $Name
        $script:checks += "x $Name"
        $script:fails++
    }
}

Test-Check "Git"              { Test-Command "git" }
Test-Check "GitHub CLI"       { Test-Command "gh" }
Test-Check "Node.js 22+"      { $v = [int]((node -v) -replace 'v(\d+)\..*', '$1'); $v -ge 22 }
Test-Check "Bun"              { Test-Command "bun" }
Test-Check "Claude Code"      { Test-Command "claude" }
Test-Check "Locus CLI"        { Test-Command "locus" }
Test-Check "Repository"       { Test-Path (Join-Path $Dir ".git") }
Test-Check "Locus Init"       { Test-Path (Join-Path $Dir ".locus\config.json") }

# ─── Summary ─────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  +===============================================+" -ForegroundColor Cyan
Write-Host "  |         Setup Complete!                       |" -ForegroundColor Cyan
Write-Host "  +===============================================+" -ForegroundColor Cyan
Write-Host ""

Write-Info "Project:    $Dir"
Write-Info "Branch:     $Branch"

if ($fails -eq 0) {
    Write-Success "All checks passed"
} else {
    Write-Warn "$fails check(s) failed -- review output above"
}

Write-Host ""
Write-Host "  Quick Start:" -ForegroundColor White
Write-Host "    > cd $Dir" -ForegroundColor DarkGray
Write-Host "    > locus plan                     # AI sprint planning" -ForegroundColor DarkGray
Write-Host "    > locus run                      # Execute sprint tasks" -ForegroundColor DarkGray
Write-Host "    > locus exec `"describe this project`" # Quick AI query" -ForegroundColor DarkGray
Write-Host ""

Write-Host "  Useful Commands:" -ForegroundColor White
Write-Host "    > locus config show              # View configuration" -ForegroundColor DarkGray
Write-Host "    > locus status                   # View sprint status" -ForegroundColor DarkGray
Write-Host "    > locus review                   # AI code review" -ForegroundColor DarkGray
Write-Host ""

Write-Host "  Agent CLI Setup:" -ForegroundColor White
Write-Host "  Locus requires an AI agent CLI to run tasks. If you haven't set one up yet:" -ForegroundColor DarkGray
Write-Host ""
Write-Host "    Claude Code  https://code.claude.com/docs" -ForegroundColor Cyan
Write-Host "    OpenAI Codex https://developers.openai.com/codex/cli/" -ForegroundColor Cyan
Write-Host ""
