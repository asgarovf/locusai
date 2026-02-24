---
description: Dashboard view showing repository info, active sprint progress, worktrees, and agent-managed PRs.
---

# locus status

Display a dashboard view of the current project state. Combines data from the local configuration, GitHub milestones, pull requests, worktrees, and run state into a single overview.

## Usage

```bash
locus status
```

---

## Dashboard Sections

### Repository Info

Shows the GitHub repository (`owner/repo`), configured AI provider and model, and the base branch.

### Sprint Progress

If an active sprint is set, displays:

- Sprint name and completion count (e.g., "3 of 7 done")
- Due date (if set)
- A progress bar
- Issue breakdown by status: in-progress, queued, failed, done

If no active sprint is set, displays "none active".

### Active Run

If a run is in progress (from `locus run`), shows:

- Run type (`sprint` or `parallel`) and run ID
- Task counts: done, running, pending, failed

### Active Worktrees

Lists any active git worktrees created by Locus for parallel issue execution, showing the issue number and branch name.

### Agent PRs

Lists up to 5 open pull requests with the `agent:managed` label, showing PR number, title, and state. If more than 5 exist, a count of additional PRs is shown.

---

## Examples

```bash
# View the project dashboard
locus status
```

Sample output (conceptual):

```
+--- Locus Status ----------------------------------------+
|  Repo:     myorg/myapp                                  |
|  Provider: claude / claude-sonnet-4-6                    |
|  Branch:   main                                         |
|                                                         |
|  Sprint:  Sprint 1 (3 of 5 done, due Mar 7)            |
|  ██████░░░░░░░░░░░░░░░░░░░░░░░░                        |
|  ● 1 in-progress  ○ 1 queued  ✓ 3 done                 |
|                                                         |
|  Active Worktrees:                                      |
|    ● issue-42  locus/issue-42                           |
|                                                         |
|  Agent PRs:                                             |
|    ⟳ #15  Add user authentication  open                 |
|    ⟳ #16  Implement rate limiting  open                 |
+---------------------------------------------------------+
```
