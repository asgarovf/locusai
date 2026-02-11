---
description: Deploy Locus agents on a Linux server with systemd.
---

# Linux Setup

This guide covers deploying Locus agents on Ubuntu/Debian with systemd services for automatic startup and background execution.

---

## Requirements

* Ubuntu 20.04+ or Debian 11+
* `sudo` access
* 2 GB+ disk space
* Internet access for package installation

---

## Automated Setup

Run the setup script with your configuration:

```bash
curl -fsSL https://locusai.dev/install.sh | bash -s -- \
  --repo "owner/repo" \
  --api-key "your-api-key" \
  --gh-token "your-github-token"
```

With Telegram:

```bash
curl -fsSL https://locusai.dev/install.sh | bash -s -- \
  --repo "owner/repo" \
  --api-key "your-api-key" \
  --gh-token "your-github-token" \
  --telegram-token "your-bot-token" \
  --telegram-chat-id "your-chat-id"
```

| Argument | Description | Required |
|----------|-------------|----------|
| `--repo` | GitHub repository (owner/repo) | Yes |
| `--api-key` | Locus API key | Yes |
| `--gh-token` | GitHub personal access token | Yes |
| `--branch` | Branch to clone (default: main) | No |
| `--telegram-token` | Telegram bot token | No |
| `--telegram-chat-id` | Telegram chat ID | No |

---

## What the Script Does

The setup script performs these steps in order:

1. **System dependencies** — Installs build tools, curl, git
2. **Node.js** — Installs via nvm
3. **Bun** — Installs the Bun runtime
4. **GitHub CLI** — Installs and authenticates `gh`
5. **Claude CLI** — Installs Anthropic's Claude agent
6. **Locus CLI** — Installs `@locusai/cli` globally
7. **Locus Telegram** — Installs `@locusai/telegram` globally
8. **Clone repository** — Clones your project to `~/locus-workspace/`
9. **Initialize Locus** — Runs `locus init` and `locus config setup`
10. **Telegram service** — Creates systemd service for the bot
11. **Locus agent service** — Creates systemd service for the agent

---

## Systemd Services

Two services are created:

### Telegram Bot Service

```
locus-telegram.service
```

```bash
# Check status
sudo systemctl status locus-telegram

# View logs
sudo journalctl -u locus-telegram -f

# Restart
sudo systemctl restart locus-telegram
```

### Locus Agent Service

```
locus-agent.service
```

```bash
# Check status
sudo systemctl status locus-agent

# View logs
sudo journalctl -u locus-agent -f

# Restart
sudo systemctl restart locus-agent
```

{% hint style="info" %}
Both services are configured to start automatically on boot and restart on failure.
{% endhint %}

---

## Manual Setup

If you prefer manual installation, follow these steps:

<details>

<summary>Step-by-step manual setup</summary>

```bash
# 1. Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install --lts

# 2. Install Bun
curl -fsSL https://bun.sh/install | bash

# 3. Install GitHub CLI
# See: https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# 4. Install Claude CLI
npm install -g @anthropic-ai/claude-code

# 5. Install Locus
npm install -g @locusai/cli
npm install -g @locusai/telegram  # optional

# 6. Clone and initialize
git clone https://github.com/owner/repo ~/locus-workspace/repo
cd ~/locus-workspace/repo
locus init
locus config setup --api-key "your-key"

# 7. Start
locus-telegram  # in one terminal
locus run        # in another
```

</details>
