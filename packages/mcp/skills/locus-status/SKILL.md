| name | description |
| --- | --- |
| locus-status | Show the Locus project dashboard — active sprint, issue breakdown by status, running agents, and open pull requests. |

# Project Status Dashboard

## Process

1. **Get status**:
   - If MCP tool available: call `locus_status`
   - If CLI available: run `locus status` via Bash
2. **Enrich** (optional): also call `locus_sprint_list` and `locus_issue_list` for more detail
3. **Display** — format as a clear dashboard

## Output Format

```
Project: owner/repo
Active Sprint: sprint-name (3/8 done)

Issues:
  ● queued:      5
  ◐ in-progress: 2
  ◑ in-review:   1
  ✓ done:        3
  ✗ failed:      0

Open PRs:
  #42 feat: add auth — awaiting review
  #43 fix: login bug — changes requested

Running Agents: 0
```
