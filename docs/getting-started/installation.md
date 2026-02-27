---
description: Install the Locus CLI, GitHub CLI, and configure your AI provider.
---

# Installation

## Prerequisites

Locus requires three things on your machine before you can start:

| Requirement | Minimum Version | Purpose |
|-------------|-----------------|---------|
| [Node.js](https://nodejs.org) | 18+ | Runtime for the CLI |
| [GitHub CLI](https://cli.github.com) (`gh`) | Latest | All GitHub operations (issues, PRs, milestones) |
| AI Provider CLI | Latest | Task execution and code generation |

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

You should see output like:

```
3.0.0
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

## Set Up an AI Provider

Locus delegates code generation and analysis to an external AI agent. You need at least one provider configured.

### Option A: Claude Code (Anthropic)

Install Claude Code following the [official documentation](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview), then set your API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Add the export to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to persist it.

### Option B: Codex (OpenAI)

Install Codex following the [official documentation](https://openai.com/index/introducing-codex/), then set your API key:

```bash
export OPENAI_API_KEY="sk-..."
```

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

Once installed, follow the guided onboarding path:

1. [Quickstart](quickstart.md) -- complete one full issue-to-PR workflow with expected outcomes
2. [Initialization](initialization.md) -- deep dive into what `locus init` creates and configures
3. [Your First Sprint (Detailed)](first-sprint.md) -- expanded walkthrough with advanced options
