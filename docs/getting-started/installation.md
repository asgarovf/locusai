---
description: Install the Locus CLI and optional Telegram bot package.
---

# Installation

## Prerequisites

Before installing Locus, make sure you have:

* **Node.js 18+** — [Download Node.js](https://nodejs.org)
* **Git** — [Download Git](https://git-scm.com)
* **A Locus account** — Sign up at [app.locusai.dev](https://app.locusai.dev)
* **An AI provider CLI** — Either [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli) or [Codex CLI](https://github.com/openai/codex)

{% hint style="info" %}
You need at least one AI provider installed. Locus uses Claude (Anthropic) or Codex (OpenAI) to execute tasks. You can switch between them at any time.
{% endhint %}

---

## Install the CLI

{% tabs %}
{% tab title="npm" %}
```bash
npm install -g @locusai/cli
```
{% endtab %}

{% tab title="pnpm" %}
```bash
pnpm add -g @locusai/cli
```
{% endtab %}

{% tab title="yarn" %}
```bash
yarn global add @locusai/cli
```
{% endtab %}

{% tab title="bun" %}
```bash
bun add -g @locusai/cli
```
{% endtab %}
{% endtabs %}

Verify the installation:

```bash
locus --help
```

{% hint style="success" %}
You should see the Locus help output listing all available commands.
{% endhint %}

---

## Install the Telegram Bot (Optional)

If you want to control Locus from Telegram, install the bot package separately:

```bash
npm install -g @locusai/telegram
```

Verify:

```bash
locus-telegram --help
```

{% hint style="info" %}
The Telegram bot is a long-running process — it stays connected to Telegram and executes commands on your behalf. See the [Telegram Setup Guide](../telegram/setup.md) for configuration details.
{% endhint %}

---

## Run Without Installing

You can use `npx` to run Locus without a global installation:

```bash
npx @locusai/cli init
npx @locusai/cli config setup
npx @locusai/cli run
```

{% hint style="warning" %}
`npx` downloads the package each time. For regular use, a global install is recommended.
{% endhint %}

---

## Automated Server Setup

For deploying Locus on a server (Linux or macOS), use the automated installer:

```bash
curl -fsSL https://locusai.dev/install.sh | bash -s -- \
  --repo "owner/repo" \
  --api-key "your-api-key" \
  --gh-token "your-github-token"
```

This installs all dependencies, configures services, and sets up automatic agent execution. See [Self-Hosting](../self-hosting/overview.md) for full details.

---

## Next Steps

Once installed, you need to:

1. [Set up your workspace](workspace-setup.md) — Create a workspace and get your API key
2. [Initialize your project](initialization.md) — Run `locus init` in your repository
