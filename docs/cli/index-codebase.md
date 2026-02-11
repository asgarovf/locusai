---
description: Create a semantic index of your codebase for AI context.
---

# index

Scan and analyze your project structure to create a codebase index that helps AI agents understand your architecture.

```bash
locus index
```

---

## What It Does

1. Scans your project directory structure
2. Analyzes file and folder organization
3. Uses AI to summarize large directories
4. Saves the index to `.locus/codebase-index.json`

The index is included in agent context during `locus run` and `locus exec`, helping agents navigate and understand your codebase before making changes.

---

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--dir <PATH>` | Project directory | Current directory |
| `--model <MODEL>` | AI model for summarization | From config |
| `--provider <PROVIDER>` | AI provider | From config |

---

## When to Re-Index

Re-run `locus index` when:

* You've made significant structural changes (new folders, reorganized files)
* You've added major new components or modules
* Agents seem confused about where things are in your project

{% hint style="info" %}
You don't need to re-index for every change. The index captures the high-level structure, not individual file contents.
{% endhint %}
