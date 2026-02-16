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
│   ├── LOCUS.md                 # AI agent instructions
│   ├── LEARNINGS.md             # Continuous learning log
│   ├── artifacts/               # Generated files and outputs
│   ├── documents/               # Synced workspace documents
│   ├── sessions/                # Exec session history
│   ├── reviews/                 # Code review reports
│   └── plans/                   # Sprint plans
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

### .locus/LEARNINGS.md

A continuously growing log of lessons learned during development. When you correct an agent's approach (e.g., "use Zod instead of manual parsing"), the learning is recorded here. Agents read this file before every task to avoid repeating past mistakes.

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
