---
description: Initialize Locus in your project repository.
---

# Project Initialization

## Initialize Locus

Navigate to your project directory and run:

```bash
locus init
```

This creates the Locus project structure and configuration files in your repository.

---

## What Gets Created

```
your-project/
├── .locus/
│   ├── config.json              # Project metadata (name, version)
│   ├── settings.json            # API key and provider settings
│   ├── artifacts/               # Generated files and outputs
│   ├── documents/               # Synced workspace documents
│   ├── sessions/                # Exec session history
│   ├── reviews/                 # Code review reports
│   ├── plans/                   # Sprint plans
│   ├── LOCUS.md                    # AI agent instructions
│   └── project/
│       ├── context.md           # Project knowledge base
│       └── progress.md          # Sprint progress tracking
└── .gitignore                   # Updated with Locus patterns
```

{% hint style="info" %}
The `.locus/settings.json` file is automatically added to `.gitignore` to prevent committing your API key.
{% endhint %}

---

## Key Files

### .locus/LOCUS.md

This file provides instructions to AI agents when they work on your project. It lives inside the `.locus/` directory and is read by agents before executing tasks.

You can customize it to include:

* Project-specific coding conventions
* Architecture decisions
* Dependencies and tools used
* Any instructions you want agents to follow

### .locus/project/context.md

A knowledge base file where you can document your project's mission, tech stack, architecture, and key decisions. Agents read this to understand your project context.

### .locus/project/progress.md

Tracks sprint progress and completed tasks. This is updated automatically as agents complete work.

---

## Re-initialization

Running `locus init` again is safe. It will:

* Update the version in `config.json`
* Create any missing directories
* Skip files that already exist

{% hint style="success" %}
You can safely re-run `locus init` after updating the CLI to ensure your project structure is up to date.
{% endhint %}

---

## Next Steps

Your project is now ready. Here's what you can do:

* **Create tasks** in the [dashboard](https://app.locusai.dev) and run `locus run` to start agents
* **Plan a sprint** with `locus plan "your goal"` to have AI create tasks for you
* **Execute a prompt** with `locus exec "your prompt"` for one-off AI tasks
* **Set up Telegram** for remote control — see the [Telegram guide](../telegram/overview.md)
