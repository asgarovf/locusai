---
title: Workspace Setup
description: Configure your Locus workspace, including API keys and global verification checklists.
---

Before you start using Locus agents, you need to configure your workspace settings. This guide covers the essential setup steps.

## API Keys

To authenticate your agents, you need an API Key.

1.  Log in to the [Locus Dashboard](https://app.locusai.dev).
2.  Navigate to **Settings > API Keys**.
3.  Click **Create New Key**.
4.  **Copy the key immediately**. For security reasons, the key is only shown once.

<Important>
Keep your API key secure. Do not commit it to version control. Use environment variables (e.g., `LOCUS_API_KEY`) where possible.
</Important>

## Global Verification Checklist

You can define a default set of verification commands that **all agents** must run before completing a task. This is useful for enforcing repository-wide quality standards (e.g., linting, testing).

To configure this:

1.  Go to **Settings > Workspace Settings** in the dashboard.
2.  Find the **Verification Checklist** section.
3.  Add your commands (one per line).

**Examples:**
- `npm run lint`
- `npm run test -- --passWithNoTests`
- `npm run build`

When an agent finishes its implementation, it will automatically execute these commands. If any command fails, the agent will attempt to fix the issue before submitting the task for review.
