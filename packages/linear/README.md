# @locusai/locus-linear

Linear integration for [Locus](https://github.com/locusai/locus) — sync issues, AI-powered workflows, and bidirectional project management.

## Setup

```bash
locus install @locusai/locus-linear
```

### 1. Authenticate

```bash
locus pkg linear auth
```

Opens your browser for Linear OAuth. After authorization, the package auto-detects your team, workflow states, and labels.

### 2. Set team (if multiple teams)

```bash
locus pkg linear team ENG
```

### 3. Verify configuration

```bash
locus pkg linear auth --status
locus pkg linear mapping
```

## Commands

### Authentication

```bash
locus pkg linear auth              # Complete OAuth flow (opens browser)
locus pkg linear auth --status     # Show current auth status
locus pkg linear auth --revoke     # Revoke OAuth token
```

### Team

```bash
locus pkg linear team              # Show current team
locus pkg linear team ENG          # Set active team
```

### Import (Linear → GitHub)

```bash
locus pkg linear import                       # Import all matching issues
locus pkg linear import --cycle               # Import from active cycle only
locus pkg linear import --project "Backend"   # Import from specific project
locus pkg linear import --dry-run             # Preview without creating issues
locus pkg linear import --enrich              # AI-enrich issues during import
```

### Export (GitHub → Linear)

```bash
locus pkg linear export              # Export status updates to Linear
locus pkg linear export --dry-run    # Preview without updating Linear
```

### Sync (Bidirectional)

```bash
locus pkg linear sync              # Import + export in sequence
locus pkg linear sync --dry-run    # Preview both directions
```

### AI-Powered Issue Creation

```bash
locus pkg linear create "Add rate limiting to the API"    # AI-enriched issue
locus pkg linear create "Fix login bug" --no-ai           # Plain issue
```

The AI analyzes your codebase to generate a detailed description, acceptance criteria, priority, and labels.

### Query Issues

```bash
locus pkg linear issues                # List issues from configured team
locus pkg linear issues --cycle        # List issues in active cycle
locus pkg linear issues --limit 25     # Limit number of results
locus pkg linear issue ENG-123         # Show full issue details
```

### Field Mappings

```bash
locus pkg linear mapping    # Show state, label, and priority mappings
```

## Configuration

Configuration is stored in `.locus/config.json` under `packages.linear`:

```json
{
  "packages": {
    "linear": {
      "auth": { ... },
      "teamKey": "ENG",
      "stateMapping": {
        "Backlog": "backlog",
        "Todo": "todo",
        "In Progress": "in-progress",
        "Done": "done"
      },
      "labelMapping": { ... },
      "userMapping": { ... },
      "importFilter": {
        "states": [],
        "priorities": []
      }
    }
  }
}
```

Mappings are auto-detected during `locus pkg linear auth` and can be manually edited in the config file.

## Requirements

- Node.js >= 18
- [GitHub CLI (`gh`)](https://cli.github.com/) — for import/export commands
- A Linear account with OAuth access
