---
description: Sync workspace documents to your local project.
---

# docs

Fetch documents from your Locus workspace and save them locally for agent context.

---

## Sync Documents

```bash
locus docs sync
```

This downloads all documents from your workspace and saves them to `.locus/documents/`.

Documents include:
* General documentation
* PRDs (Product Requirement Documents)
* Technical specifications
* Architecture Decision Records (ADRs)
* API design documents

---

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--api-key <KEY>` | API key | From config |
| `--api-url <URL>` | API base URL | From config |
| `--workspace <ID>` | Workspace ID | Auto-resolved |
| `--dir <PATH>` | Output directory | `.locus/documents/` |

{% hint style="info" %}
Synced documents are automatically included in agent context when running `locus run` or `locus exec`. Keep them up to date by running `locus docs sync` before starting agents.
{% endhint %}
