---
description: AI-powered code review for pull requests and staged changes.
---

# review

Review code with AI — either GitHub pull requests from Locus agents or your local staged changes.

---

## PR Review

Review open pull requests created by Locus agents:

```bash
locus review
```

This:
1. Finds unreviewed Locus-created PRs on GitHub
2. Analyzes the changes using your AI provider
3. Posts the review

{% hint style="info" %}
Requires the [GitHub CLI](https://cli.github.com/) (`gh`) to be installed and authenticated.
{% endhint %}

---

## Local Review

Review your staged git changes without GitHub:

```bash
locus review local
```

This analyzes your staged changes and generates a review report saved to `.locus/reviews/`.

---

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--api-key <KEY>` | API key | From config |
| `--workspace <ID>` | Workspace ID | Auto-resolved |
| `--model <MODEL>` | AI model | From config |
| `--provider <PROVIDER>` | AI provider | From config |
| `--api-url <URL>` | API base URL | From config |
| `--dir <PATH>` | Project directory | Current directory |
