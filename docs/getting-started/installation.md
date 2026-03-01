---
description: Install the Locus CLI, GitHub CLI, and an AI provider CLI (Claude Code or Codex).
---

# Installation

## Prerequisites

Locus requires three baseline tools, plus Docker Desktop for sandboxed execution:

| Requirement | Minimum Version | Purpose |
|-------------|-----------------|---------|
| [Node.js](https://nodejs.org) | 18+ | Runtime for the CLI |
| [GitHub CLI](https://cli.github.com) (`gh`) | Latest | All GitHub operations (issues, PRs, milestones) |
| AI Provider CLI | Latest | Task execution and code generation |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 4.58+ | Sandbox isolation for safe AI execution (`docker sandbox`) |

You need **one** of the following AI provider CLIs installed:

* [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) (Anthropic) -- default provider
* [Codex](https://openai.com/index/introducing-codex/) (OpenAI)

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
locus --version
```

---

## Set Up GitHub CLI

Locus uses the GitHub CLI (`gh`) for every GitHub interaction -- creating issues, milestones, labels, and pull requests. Install and authenticate it before proceeding.

### Install `gh`

{% tabs %}
{% tab title="macOS" %}
```bash
brew install gh
```
{% endtab %}

{% tab title="Linux" %}
```bash
# Debian/Ubuntu
sudo apt install gh

# Fedora
sudo dnf install gh
```
{% endtab %}

{% tab title="Windows" %}
```bash
winget install --id GitHub.cli
```
{% endtab %}
{% endtabs %}

### Authenticate

```bash
gh auth login
```

Follow the interactive prompts to authenticate with your GitHub account. When finished, verify:

```bash
gh auth status
```

You should see output confirming you are logged in.

{% hint style="info" %}
Locus checks for `gh` authentication every time you run `locus init`. If authentication expires, re-run `gh auth login`.
{% endhint %}

---

## Set Up an AI Provider CLI

Locus delegates code generation and analysis to an external AI CLI tool. You need at least one installed and authenticated.

### Option A: Claude Code (Anthropic) -- default

Install Claude Code by following the [official installation guide](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview):

```bash
npm install -g @anthropic-ai/claude-code
```

After installation, launch `claude` once to complete the authentication flow. Claude Code manages its own API credentials -- no manual API key setup is required.

### Option B: Codex (OpenAI)

Install Codex by following the [official installation guide](https://openai.com/index/introducing-codex/):

```bash
npm install -g @openai/codex
```

After installation, launch `codex` once to complete the authentication flow. Codex manages its own API credentials -- no manual API key setup is required.

### Switching Providers

Locus defaults to Claude (`claude-sonnet-4-6`). You can change the provider and model at any time:

```bash
# Switch to Codex
locus config set ai.model codex-mini-latest

# Switch back to Claude
locus config set ai.model claude-sonnet-4-6
```

The provider is inferred automatically from the model name -- no need to set it separately.

---

## Set Up Sandboxing (Recommended)

Locus can run AI agents inside Docker sandboxes for isolated, safe execution. This prevents agents from accessing host secrets, credentials, and system paths.

**Why sandboxing matters:** AI agents in full-auto mode have unrestricted access to your filesystem. Docker sandboxing ensures they only see what you allow via `.sandboxignore` rules, keeping `.env` files, API keys, and cloud credentials out of reach.

To set up sandboxing:

```bash
# 1. Verify Docker is available
docker sandbox ls

# 2. Create provider sandboxes
locus sandbox

# 3. Authenticate inside each sandbox
locus sandbox claude
locus sandbox codex
```

Full guide: [Sandboxing Setup (Docker-First)](sandboxing-setup.md)

{% hint style="warning" %}
Without sandboxing, AI agents run with full access to your host filesystem. For teams and production use, sandboxing is strongly recommended.
{% endhint %}

---

## Run Without Installing

You can use `npx` to try Locus without a global installation:

```bash
npx @locusai/cli --version
npx @locusai/cli init
npx @locusai/cli plan "Build a REST API"
```

{% hint style="warning" %}
`npx` downloads the package on each invocation. For regular use, a global install is recommended.
{% endhint %}

---

## Next Steps

1. [Sandboxing Setup](sandboxing-setup.md) -- set up Docker sandbox isolation
2. [Quickstart](quickstart.md) -- complete one full issue-to-PR workflow
