---
description: Create a Locus workspace and configure your CLI with an API key.
---

# Workspace Setup

## Create Your Workspace

1. Go to [app.locusai.dev](https://app.locusai.dev)
2. Sign up or log in with your email (OTP authentication)
3. Create a new workspace for your project

{% hint style="info" %}
A **workspace** maps to a single project or repository. Each workspace has its own tasks, sprints, documents, and API keys.
{% endhint %}

---

## Generate an API Key

1. Open your workspace in the dashboard
2. Go to **Settings → API Keys**
3. Click **Create API Key**
4. Copy the key — you'll need it for CLI configuration

{% hint style="warning" %}
API keys are scoped to a workspace. Keep them secure and never commit them to your repository.
{% endhint %}

---

## Configure the CLI

Run the interactive setup:

```bash
locus config setup
```

This prompts you for:

| Setting      | Description                         | Required |
| ------------ | ----------------------------------- | -------- |
| `apiKey`     | Your workspace API key              | Yes      |
| `apiUrl`     | API base URL (uses default if empty)| No       |
| `provider`   | AI provider: `claude` or `codex`    | No       |
| `model`      | Specific model name                 | No       |

You can also configure non-interactively:

```bash
locus config setup --api-key "your-key" --provider claude
```

### Verify Your Configuration

```bash
locus config show
```

This displays your current settings with secrets masked.

---

## Configuration Storage

Settings are stored in `.locus/settings.json` in your project directory. This file is automatically added to `.gitignore` by `locus init` to prevent accidentally committing secrets.

<details>

<summary>Example settings.json structure</summary>

```json
{
  "apiKey": "locus_...",
  "apiUrl": "https://api.locusai.dev/api",
  "provider": "claude",
  "model": "claude-sonnet-4-5-20250929"
}
```

</details>

---

## Workspace Auto-Resolution

You don't need to manually configure a `workspaceId`. Locus automatically resolves your workspace from the API key. The API key is scoped to a specific workspace, so Locus knows which workspace to use.

---

## Next Steps

* [Initialize your project](initialization.md) — Set up Locus in your repository
