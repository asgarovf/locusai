| name | description |
| --- | --- |
| locus-run | Execute sprint tasks or specific issues. Spawns AI agents that create branches, write code, and open PRs. Supports parallel execution via git worktrees. |

# Issue Execution

## Process

1. **Determine scope**:
   - No args → run active sprint issues sequentially
   - Issue numbers → run those issues (parallel if multiple)
2. **Show preview** — list which issues will be executed
3. **Execute**:
   - If MCP tool available: call `locus_run` with issue numbers
   - If CLI available: run `locus run [issues...]` via Bash
4. **Report results** — show created branches and PRs

## Arguments

- Issue numbers (optional, space-separated): specific issues to run
- `--dry-run`: preview without executing
- `--model <name>`: override AI model
- `--resume`: resume interrupted run

## Important

- Long-running operation — may take several minutes per issue
- Each issue creates a feature branch and opens a PR
- If MCP, use `timeout: 600000` (10 min)
- Show progress updates to the user
