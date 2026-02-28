| name | description |
| --- | --- |
| locus-plan | AI-powered sprint planning. Breaks a goal into well-structured GitHub issues with priorities, dependencies, labels, and execution order. |

# Sprint Planning

## Process

1. **Read project context** — check LOCUS.md (or `locus://instructions` resource) for project conventions
2. **Analyze the goal** — understand what the user wants to achieve
3. **Execute planning**:
   - If MCP tool available: call `locus_plan` with the directive
   - If CLI available: run `locus plan "<directive>"` via Bash
4. **Show results** — display the proposed issues with titles, priorities, and dependencies
5. **Ask for approval** — let the user review before creating issues
6. **Create issues** — on approval, call `locus_plan_approve` or `locus plan approve <id>`

## Arguments

- First argument: the goal/directive (required)
- `--sprint <name>`: assign to a sprint
- `--dry-run`: preview without creating

## Output Format

Show the plan as a numbered list:
```
Sprint Plan: "<goal>"

1. [critical] Issue title — brief description
   depends on: none
2. [high] Issue title — brief description
   depends on: #1
3. [medium] Issue title — brief description
   depends on: #1, #2
```

Then ask: "Create these issues? (approve/edit/cancel)"
