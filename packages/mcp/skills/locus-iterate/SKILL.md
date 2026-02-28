| name | description |
| --- | --- |
| locus-iterate | Close the feedback loop: re-execute tasks with PR review feedback. Reads review comments, applies fixes, and pushes updated code. |

# Iterate on Feedback

## Process

1. **Determine target**:
   - PR number → iterate on that PR's feedback
   - Issue number → find the PR for that issue, iterate
   - `--sprint` → iterate on all active sprint PRs with feedback
2. **Execute**:
   - If MCP tool available: call `locus_iterate`
   - If CLI available: run `locus iterate [--pr N | issue | --sprint]` via Bash
3. **Report** — show what was changed and whether review feedback was addressed

## Arguments

- PR number via `--pr <N>`: iterate on specific PR
- Issue number (positional): find PR for this issue
- `--sprint`: iterate all sprint PRs with pending feedback
- `--dry-run`: preview without executing

## Workflow

The full Locus cycle is: **plan → run → review → iterate → merge**

This command handles the "iterate" step — it reads review comments from a PR, understands what needs to change, and re-executes the AI agent with that feedback context.
