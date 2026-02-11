---
description: Deploy Locus agents on macOS with LaunchAgent services.
---

# macOS Setup

This guide covers deploying Locus agents on macOS with LaunchAgent services for background execution.

---

## Requirements

* macOS 12 (Monterey) or later
* 4 GB RAM minimum (8 GB recommended)
* 2 CPU cores minimum
* 2 GB+ disk space
* Internet access for package installation

---

## Automated Setup

Run the installer and follow the interactive prompts:

```bash
curl -fsSL https://locusai.dev/install.sh | bash
```

The script will guide you through configuring:

| Setting | Description | Required |
|---------|-------------|----------|
| Repository URL | GitHub repository to clone | Yes |
| Branch | Branch to checkout (default: main) | No |
| Locus API Key | Your Locus API key | No |
| GitHub Token | GitHub personal access token | No |
| Telegram Bot Token | Token from @BotFather | No |
| Telegram Chat ID | Chat ID for authorization | No |

Press Enter to skip any optional field.

<details>

<summary>Non-interactive usage (for scripted/automated deployments)</summary>

You can pass all parameters as flags to skip the interactive prompts:

```bash
curl -fsSL https://locusai.dev/install.sh | bash -s -- \
  --repo "owner/repo" \
  --api-key "your-api-key" \
  --gh-token "your-github-token" \
  --telegram-token "your-bot-token" \
  --telegram-chat-id "your-chat-id"
```

</details>

---

## What the Script Does

1. **Homebrew** — Installs if not present
2. **Dependencies** — Git, jq, and build tools via Homebrew
3. **Node.js** — Installs via nvm
4. **Bun** — Installs the Bun runtime
5. **GitHub CLI** — Installs and authenticates `gh`
6. **Claude CLI** — Installs Anthropic's Claude agent
7. **Locus CLI** — Installs `@locusai/cli` globally
8. **Locus Telegram** — Installs `@locusai/telegram` globally
9. **Clone repository** — Clones your project to `~/locus-workspace/`
10. **Initialize Locus** — Runs `locus init` and `locus config setup`
11. **Telegram LaunchAgent** — Creates macOS service for the bot
12. **Locus Agent LaunchAgent** — Creates macOS service for the agent

---

## LaunchAgent Services

Two LaunchAgents are created in `~/Library/LaunchAgents/`:

### Telegram Bot

```
com.locus.telegram.plist
```

```bash
# Start
launchctl load ~/Library/LaunchAgents/com.locus.telegram.plist

# Stop
launchctl unload ~/Library/LaunchAgents/com.locus.telegram.plist

# Check if running
launchctl list | grep locus
```

### Locus Agent

```
com.locus.agent.plist
```

```bash
# Start
launchctl load ~/Library/LaunchAgents/com.locus.agent.plist

# Stop
launchctl unload ~/Library/LaunchAgents/com.locus.agent.plist
```

---

## Logs

Logs are stored in `~/locus-workspace/logs/`:

```bash
# Telegram bot logs
tail -f ~/locus-workspace/logs/telegram.log

# Agent logs
tail -f ~/locus-workspace/logs/agent.log
```

{% hint style="info" %}
LaunchAgents start automatically on login and restart on failure.
{% endhint %}

---

## Manual Setup

<details>

<summary>Step-by-step manual setup</summary>

```bash
# 1. Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install dependencies
brew install git jq

# 3. Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.zshrc
nvm install --lts

# 4. Install Bun
curl -fsSL https://bun.sh/install | bash

# 5. Install GitHub CLI
brew install gh

# 6. Install Claude CLI
npm install -g @anthropic-ai/claude-code

# 7. Install Locus
npm install -g @locusai/cli
npm install -g @locusai/telegram  # optional

# 8. Clone and initialize
git clone https://github.com/owner/repo ~/locus-workspace/repo
cd ~/locus-workspace/repo
locus init
locus config setup --api-key "your-key"

# 9. Start
locus-telegram  # in one terminal
locus run        # in another
```

</details>
