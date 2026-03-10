# @locusai/locus-jira

Jira integration for [Locus](https://github.com/asgarovf/locusai) — fetch, execute, and sync Jira issues with AI agents.

## Setup

```bash
locus install jira
```

### 1. Authenticate

```bash
locus pkg jira auth
```

Authenticates with your Jira instance using an API Token or Personal Access Token (PAT). Follow the interactive prompts to enter your Jira domain, email, and token.

### 2. Select project

```bash
locus pkg jira project
```

Interactively select the active Jira project to work with.

### 3. Select board (optional)

```bash
locus pkg jira board
```

Select the active Jira board for sprint-based workflows.

### 4. Verify configuration

```bash
locus pkg jira auth --status
```

## Commands

### Authentication

```bash
locus pkg jira auth              # Authenticate with Jira (API Token or PAT)
locus pkg jira auth --status     # Show current authentication status
locus pkg jira auth --revoke     # Clear stored credentials
locus pkg jira auth --method api-token  # Skip interactive auth method selection
```

### Project & Board

```bash
locus pkg jira project           # Select active Jira project
locus pkg jira board             # Select active Jira board
```

### List Issues

```bash
locus pkg jira issues                         # List issues (tabular view)
locus pkg jira issues --sprint                # Show issues from active sprint
locus pkg jira issues --jql "status = 'To Do'"  # Custom JQL filter
locus pkg jira issues --limit 50              # Limit results (default: 25)
```

### Show Issue Details

```bash
locus pkg jira issue PROJ-123    # Show detailed view of a single issue
```

### Execute Issues

```bash
locus pkg jira run --sprint                # Fetch and execute active sprint issues
locus pkg jira run --jql "assignee = currentUser()"  # Execute issues by JQL
locus pkg jira run --status "To Do"        # Filter by Jira status
locus pkg jira run --dry-run               # Preview without executing
locus pkg jira run --sync                  # Sync status back to Jira after execution
```

### Sprint Shorthand

```bash
locus pkg jira sprint                      # Run active sprint issues (shorthand for run --sprint)
locus pkg jira sprint --status "To Do"     # Filter sprint issues by status
locus pkg jira sprint --info               # Show sprint details without running
locus pkg jira sprint --dry-run            # Preview without executing
locus pkg jira sprint --sync               # Sync status back to Jira after execution
```

### Sync Results

```bash
locus pkg jira sync                        # Sync execution results back to Jira
locus pkg jira sync --sprint               # Sync active sprint issues
locus pkg jira sync --jql "project = PROJ" # Sync issues matching JQL query
locus pkg jira sync --comments             # Post execution summary as Jira comment
locus pkg jira sync --dry-run              # Show planned changes without executing
```

## Configuration

Configuration is stored in `.locus/config.json` under `packages.jira`:

```json
{
  "packages": {
    "jira": {
      "domain": "your-team.atlassian.net",
      "projectKey": "PROJ",
      "boardId": 1
    }
  }
}
```

## Authentication Methods

| Method | Best For |
|--------|----------|
| **API Token** | Jira Cloud — generate at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| **PAT** | Jira Data Center / Server — generate in your Jira profile settings |

## Requirements

- Node.js >= 18
- A Jira Cloud or Data Center instance
- An API Token or Personal Access Token for authentication
