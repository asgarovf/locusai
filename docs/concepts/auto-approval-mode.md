---
description: Operator guide for running Locus in auto-approval mode, including safeguards, boundaries, automation scenarios, and rollback steps.
---

# Auto-Approval Mode

Auto-approval mode is the high-automation operating style in Locus:

- Provider execution runs in full-auto mode (`claude --dangerously-skip-permissions` or `codex exec --full-auto`)
- Locus can auto-manage issue lifecycle labels (`agent.autoLabel`)
- Locus can auto-create PRs after successful execution (`agent.autoPR`)
- Interrupted runs can resume from saved run state (`locus run --resume`)

Date: **February 27, 2026**  
Reference version: **0.17.14**

## Prerequisites

Before enabling auto-approval operations, confirm all of the following:

- Repository is initialized (`locus init`)
- `gh` is authenticated with write access (`gh auth status`)
- Claude or Codex CLI is installed and authenticated
- Team branch protection is configured (required checks/reviewers)
- Working tree is clean before starting an automated run
- Sprint scope is explicit (`locus sprint show "<name>"`)

## Behavior and Safety Controls

| Control | Default | What It Protects | Operator Action |
|---|---|---|---|
| `agent.autoLabel` | `true` | Keeps GitHub status labels in sync during execution | `locus config set agent.autoLabel true` |
| `agent.autoPR` | `true` | Automatically creates PRs for successful execution | `locus config set agent.autoPR true` |
| `sprint.stopOnFailure` | `true` | Stops sprint runs on first failure instead of cascading | `locus config set sprint.stopOnFailure true` |
| `agent.rebaseBeforeTask` | `true` | Detects base-branch drift/conflicts between sprint tasks | `locus config set agent.rebaseBeforeTask true` |
| `agent.maxParallel` | `3` | Bounds concurrent standalone issue execution | `locus config set agent.maxParallel 2` |
| `--dry-run` | off | Preview execution without writes | `locus run --dry-run` |
| `--resume` | off | Continue from failed/interrupted checkpoint | `locus run --resume` |

## Recommended Operating Boundaries

Use auto-approval mode when:

- Tasks are well-scoped and acceptance criteria are explicit
- Strong CI and branch protections are enforced
- The team is comfortable with AI-generated PRs and review throughput

Prefer manual approval when:

- Changes touch auth, payments, migrations, or production-critical paths
- Requirements are ambiguous or expected to change during execution
- A one-off issue needs human checkpoints before any PR is opened

## Automation Scenario 1: Sprint Autopilot with Resume

Use this for milestone-based execution with automatic PR creation.

### Setup

```bash
locus sprint active "Sprint 8"
locus config set agent.autoLabel true
locus config set agent.autoPR true
locus config set sprint.stopOnFailure true
```

### Run

```bash
locus run
```

### If Interrupted or Failed

```bash
locus logs --level error --lines 200
locus run --resume
```

### Expected Outcome

- Task status labels are updated automatically (`queued -> in-progress -> done/failed`)
- Sprint execution halts on failure (by default), then resumes from checkpoint
- A sprint-level PR is created when successful work is ready and `agent.autoPR=true`

## Automation Scenario 2: Parallel Standalone Backlog Sweep

Use this for independent issues that can run concurrently.

### Setup

```bash
locus config set agent.maxParallel 2
locus config set agent.autoLabel true
locus config set agent.autoPR true
```

### Run

```bash
locus run 141 142 143 144
locus status
```

### Failure Handling

```bash
locus logs --level error --lines 200
# Re-run only failed issue numbers
locus run 142 144
```

### Expected Outcome

- Independent issues execute in bounded parallel batches
- Successful tasks open PRs automatically
- Failed tasks remain visible via `locus:failed` labels and logs for targeted retry

## Manual-Approval Profile (When You Need Human Gates)

If you need tighter control, disable PR automation and run with explicit checkpoints:

```bash
locus config set agent.autoPR false
locus config set agent.autoLabel true
locus run --dry-run
locus run
```

Then review changes manually and open PRs yourself.

## Risk and Safety Checklist

Use this checklist before any auto-approval run:

- [ ] Active sprint or issue list is correct
- [ ] Branch protections and required CI checks are enabled
- [ ] `agent.maxParallel` matches repo/CI capacity
- [ ] `sprint.stopOnFailure` remains enabled for sprint runs
- [ ] You have an owner on-call to inspect failures and resume
- [ ] `locus logs` path is known for troubleshooting

## Rollback Instructions

If auto-approval behavior is too risky for the current work, roll back to manual control:

1. Stop execution (`Ctrl+C`) and inspect status.
2. Disable auto PR creation:

```bash
locus config set agent.autoPR false
```

3. Verify remaining queued/failed work:

```bash
locus status
locus logs --level error --lines 200
```

4. Close or re-scope open automation PRs as needed:

```bash
gh pr list --label agent:managed --state open
gh pr close <pr-number> --comment "Closing auto-run PR during rollback to manual approval mode"
```

5. Continue with manual gating (`locus run --dry-run`, targeted `locus run <issue>`, manual PR open/review).

## Related Docs

- [Built-In Tools](../cli/overview.md)
- [Execution Model (Technical)](execution-model.md)
- [GitHub-Native Workflows](github-native-workflows.md)
- [Quickstart](../getting-started/quickstart.md)
