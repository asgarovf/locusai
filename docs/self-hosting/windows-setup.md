---
description: Deploy Locus agents on a Windows server or workstation with Scheduled Tasks.
---

# Windows Setup

This guide covers deploying Locus agents on Windows with Scheduled Tasks for background execution.

{% hint style="warning" %}
**Do not run Locus as the root/Administrator user.** Claude Code does not support running as root. You must create a dedicated user account (e.g., `locus-agent`) and run all installation and runtime commands as that user. See the [User Setup](#user-setup) section below.
{% endhint %}

---

## Requirements

* Windows 10 (version 1809+) or Windows Server 2019+
* PowerShell 5.1+
* A **non-administrator dedicated user account** (see [User Setup](#user-setup))
* 4 GB RAM minimum (8 GB recommended)
* 2 CPU cores minimum
* 2 GB+ disk space
* Internet access for package installation

---

## User Setup

Claude Code cannot run as the root or built-in Administrator user. You need a dedicated standard user account for running Locus.

### Create a Dedicated User

Open PowerShell **as Administrator** and create a new local user:

```powershell
# Create a new local user (you'll be prompted for a password)
New-LocalUser -Name "locus-agent" -Description "Locus AI Agent" -PasswordNeverExpires

# Add to Users group
Add-LocalGroupMember -Group "Users" -Member "locus-agent"
```

{% hint style="info" %}
If you need the user to install software (e.g., via `winget`), add them to the **Administrators** group instead. After setup is complete, you can demote them back to a standard user for security.
{% endhint %}

### Switch to the Dedicated User

All subsequent commands in this guide must be run as the dedicated user, **not** as Administrator.

To switch users:

* **Remote Desktop (RDP):** Log in as `locus-agent`
* **Local session:** Sign out and sign in as `locus-agent`
* **PowerShell (run as another user):**

```powershell
runas /user:locus-agent powershell
```

{% hint style="danger" %}
Do **not** run the installer or Locus services as the built-in Administrator or root user. Claude Code will refuse to start and display an error.
{% endhint %}

---

## Automated Setup

Log in as your dedicated user and run the installer in PowerShell:

```powershell
irm https://locusai.dev/install.ps1 | iex
```

{% hint style="warning" %}
**Use an HTTPS URL for your repository** (e.g. `https://github.com/user/repo.git`). The installer configures `gh auth setup-git` so that git operations (clone, push) are automatically authenticated via your GitHub token.
{% endhint %}

The script will guide you through configuring:

| Setting | Description | Required |
|---------|-------------|----------|
| Repository HTTPS URL | GitHub repository HTTPS URL to clone | Yes |
| Branch | Branch to checkout (default: main) | No |
| Locus API Key | Your Locus API key | No |
| GitHub Token | GitHub personal access token | No |
| Telegram Bot Token | Token from @BotFather | No |
| Telegram Chat ID | Chat ID for authorization | No |

Press Enter to skip any optional field.

<details>

<summary>Non-interactive usage (for scripted/automated deployments)</summary>

You can pass all parameters as flags to skip the interactive prompts:

```powershell
.\install.ps1 `
  -Repo "https://github.com/owner/repo.git" `
  -ApiKey "your-api-key" `
  -GhToken "your-github-token" `
  -TelegramToken "your-bot-token" `
  -TelegramChatId "your-chat-id"
```

</details>

---

## What the Script Does

1. **Git** — Installs via winget if not present
2. **GitHub CLI** — Installs and authenticates `gh`
3. **Node.js 22+** — Installs via winget
4. **Bun** — Installs the Bun runtime
5. **Claude CLI** — Installs Anthropic's Claude agent
6. **Locus CLI** — Installs `@locusai/cli` globally
7. **Locus Telegram** — Installs `@locusai/telegram` globally
8. **Clone repository** — Clones your project to the current directory
9. **Install dependencies** — Runs `bun install`
10. **Build packages** — Runs `bun run build`
11. **Initialize Locus** — Runs `locus init` and `locus config setup`
12. **Telegram Scheduled Task** — Creates a Windows Scheduled Task for the bot

---

## Scheduled Tasks

The installer creates a Windows Scheduled Task for the Telegram bot:

### Telegram Bot

```
LocusTelegramBot
```

```powershell
# Check status
schtasks /query /tn "LocusTelegramBot"

# Start manually
schtasks /run /tn "LocusTelegramBot"

# Stop
schtasks /end /tn "LocusTelegramBot"
```

{% hint style="info" %}
The Scheduled Task is configured to start at user logon and restart up to 3 times on failure.
{% endhint %}

### Running the Agent

Start the Locus agent manually:

```powershell
cd C:\path\to\your\repo
locus run
```

To run the agent in the background, you can create an additional Scheduled Task:

```powershell
$action = New-ScheduledTaskAction `
    -Execute (Get-Command locus).Source `
    -Argument "run" `
    -WorkingDirectory "C:\path\to\your\repo"

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365)

Register-ScheduledTask `
    -TaskName "LocusAgent" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Locus AI Agent"
```

```powershell
# Manage the agent task
schtasks /query /tn "LocusAgent"
schtasks /run   /tn "LocusAgent"
schtasks /end   /tn "LocusAgent"
```

---

## Manual Setup

<details>

<summary>Step-by-step manual setup</summary>

Ensure you are logged in as your dedicated user (e.g., `locus-agent`), **not** as Administrator.

```powershell
# 1. Install Git (if not present)
winget install --id Git.Git --silent

# 2. Install GitHub CLI
winget install --id GitHub.cli --silent

# 3. Install Node.js 22+
winget install --id OpenJS.NodeJS --silent

# 4. Install Bun
irm https://bun.sh/install.ps1 | iex

# 5. Install Claude CLI
npm install -g @anthropic-ai/claude-code

# 6. Install Locus
npm install -g @locusai/cli
npm install -g @locusai/telegram  # optional

# 7. Clone and initialize
git clone https://github.com/owner/repo.git C:\locus-workspace\repo
cd C:\locus-workspace\repo
locus init
locus config setup --api-key "your-key"

# 8. Start
locus-telegram  # in one terminal
locus run        # in another
```

</details>

---

## Troubleshooting

### "Claude Code cannot run as root"

You are running as the built-in Administrator user. Create a dedicated user and run Locus as that user instead. See [User Setup](#user-setup).

### PowerShell execution policy

If the installer fails with an execution policy error:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### winget not available

On older Windows versions or Windows Server, `winget` may not be pre-installed. Install it from the [Microsoft Store](https://apps.microsoft.com/detail/9NBLGGH4NNS1) or install dependencies (Git, Node.js, GitHub CLI) manually from their official websites.
