---
description: Install the Locus CLI, GitHub CLI, and an AI provider CLI (Claude Code or Codex).
---

# Installation

## Prerequisites

Locus requires three baseline tools, plus Docker Desktop if you want sandboxed execution:

| Requirement | Minimum Version | Purpose |
|-------------|-----------------|---------|
| [Node.js](https://nodejs.org) | 18+ | Runtime for the CLI |
| [GitHub CLI](https://cli.github.com) (`gh`) | Latest | All GitHub operations (issues, PRs, milestones) |
| AI Provider CLI | Latest | Task execution and code generation |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 4.58+ | Required for Locus sandbox isolation (`docker sandbox`) |

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

## Optional but Recommended: Enable Sandboxing

For isolated execution (recommended), set up Docker-first sandboxing after installation:

1. Verify Docker (`docker info`, `docker sandbox ls`)
2. Create provider sandboxes (`locus sandbox`)
3. Authenticate inside sandboxes (`locus sandbox claude`, `locus sandbox codex`)
4. Optional operations: install tools (`locus sandbox install bun`), run commands (`locus sandbox exec codex -- bun --version`), open shell (`locus sandbox shell codex`), and view logs (`locus sandbox logs codex --follow`)

Full guide: [Sandboxing Setup (Docker-First)](sandboxing-setup.md)

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
