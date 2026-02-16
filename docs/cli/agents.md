---
description: Manage agent worktrees.
---

# agents

List and clean up git worktrees created by Locus agents.

---

## List Worktrees

```bash
locus agents list
```

Shows all active agent worktrees with their branch, status, and HEAD commit.

---

## Clean Up Worktrees

Remove stale worktrees:

```bash
locus agents clean
```

Remove **all** agent worktrees:

```bash
locus agents clean --all
```

---

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--dir <PATH>` | Project directory | Current directory |

{% hint style="info" %}
Agent worktrees are stored in `.locus-worktrees/` in your project directory. Each worktree is named `agent/<taskId>-<slug>`.
{% endhint %}
