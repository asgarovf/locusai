#Requires -Version 5.1
<#
.SYNOPSIS
    Locus Universal Installer (Windows)
    Downloads and runs the Windows setup script.

.DESCRIPTION
    Usage (interactive):
      irm https://locusai.dev/install.ps1 | iex

    Usage (non-interactive):
      .\install.ps1 `
        -Repo "https://github.com/user/project.git" `
        -ApiKey "locus-api-key" `
        -TelegramToken "bot123:ABC" `
        -TelegramChatId "12345" `
        -GhToken "ghp_..." `
        -Branch "main"
#>

param(
    [string]$Repo = "",
    [string]$Branch = "",
    [string]$ApiKey = "",
    [string]$TelegramToken = "",
    [string]$TelegramChatId = "",
    [string]$GhToken = "",
    [string]$Dir = "",
    [switch]$Server,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# ─── Colors & Output ──────────────────────────────────────────────────────────

function Write-Info    { param([string]$Message) Write-Host "  i  $Message" -ForegroundColor Blue }
function Write-Err     { param([string]$Message) Write-Host "  x  $Message" -ForegroundColor Red }

# ─── Help ────────────────────────────────────────────────────────────────────

if ($Help) {
    Write-Host ""
    Write-Host "  Locus Universal Installer (Windows)"
    Write-Host ""
    Write-Host "  Usage:"
    Write-Host "    Interactive:     irm https://locusai.dev/install.ps1 | iex"
    Write-Host "    Non-interactive: .\install.ps1 [options]"
    Write-Host ""
    Write-Host "  Options:"
    Write-Host "    -Repo <url>             Git repository HTTPS URL to clone (required)"
    Write-Host "    -Branch <name>          Branch to checkout (default: main)"
    Write-Host "    -ApiKey <key>           Locus API key"
    Write-Host "    -GhToken <token>        GitHub personal access token"
    Write-Host "    -TelegramToken <token>  Telegram bot token from @BotFather"
    Write-Host "    -TelegramChatId <id>    Telegram chat ID for authorization"
    Write-Host "    -Dir <path>             Directory to clone into"
    Write-Host "    -Server                 Server mode (not supported on Windows)"
    Write-Host ""
    exit 0
}

# ─── Banner ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  +===============================================+" -ForegroundColor Cyan
Write-Host "  |         Locus Universal Installer             |" -ForegroundColor Cyan
Write-Host "  +===============================================+" -ForegroundColor Cyan
Write-Host ""

Write-Info "Detected Windows"

if ($Server) {
    Write-Host "  !  Server mode (dedicated user creation) is not supported on Windows. Continuing without it." -ForegroundColor Yellow
}

# ─── Build Arguments ─────────────────────────────────────────────────────────

$setupArgs = @()

if ($Repo)           { $setupArgs += "-Repo", $Repo }
if ($Branch)         { $setupArgs += "-Branch", $Branch }
if ($ApiKey)         { $setupArgs += "-ApiKey", $ApiKey }
if ($GhToken)        { $setupArgs += "-GhToken", $GhToken }
if ($TelegramToken)  { $setupArgs += "-TelegramToken", $TelegramToken }
if ($TelegramChatId) { $setupArgs += "-TelegramChatId", $TelegramChatId }
if ($Dir)            { $setupArgs += "-Dir", $Dir }

# ─── Download & Execute ─────────────────────────────────────────────────────

$baseUrl = "https://locusai.dev"
$scriptUrl = "$baseUrl/setup-windows.ps1"

Write-Info "Fetching setup script..."
Write-Host ""

$tempScript = Join-Path $env:TEMP "locus-setup-windows.ps1"

try {
    Invoke-WebRequest -Uri $scriptUrl -OutFile $tempScript -UseBasicParsing
    & $tempScript @setupArgs
} finally {
    Remove-Item -Path $tempScript -Force -ErrorAction SilentlyContinue
}
