---
description: Docker-first sandbox setup for Locus, including first-run verification and provider switching between Claude and Codex.
---

# Sandboxing Setup (Docker-First)

Use this guide when you want Locus runs isolated inside Docker sandboxes. The setup is the same whether you use Claude or Codex.

{% hint style="info" %}
Prerequisite: complete [Installation](installation.md) first so `locus`, `gh`, and at least one AI CLI are installed.
{% endhint %}

## Prerequisites

| Requirement | Why it is required |
|-------------|--------------------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.58+ | Provides the `docker sandbox` runtime Locus uses for isolation |
| Docker daemon running | Locus cannot create or sync sandboxes if Docker is stopped |
| Locus initialized in the repo (`locus init`) | Creates `.locus/` config and `.sandboxignore` defaults |

## Platform Caveats

- macOS and Windows: install Docker Desktop 4.58+ and keep Docker Desktop running.
- Linux: sandboxing requires Docker with the `docker sandbox` command available. If your Docker install does not provide it, Locus cannot run sandboxed on that machine.
- CI or headless hosts: use `--sandbox=require` to fail fast when sandbox support is missing.

## Step 1: Verify Docker Availability

Run these commands before enabling sandbox mode:

```bash
docker --version
docker info
docker sandbox ls
```

Expected outcome:

- `docker --version` returns a valid version.
- `docker info` returns daemon details without connection errors.
- `docker sandbox ls` runs without an "unknown command" error.

## Step 2: Initialize Locus in the Repository

```bash
cd /path/to/your-repo
locus init
```

Expected outcome:

- `.locus/config.json` exists.
- `.sandboxignore` exists (generated if missing).

## Step 3: Create Provider Sandboxes

```bash
locus sandbox
```

Expected outcome:

- Locus creates provider-specific sandboxes (Claude and Codex).
- `sandbox.enabled` is turned on in `.locus/config.json`.

Check state anytime:

```bash
locus sandbox status
```

## Step 4: Authenticate Inside Each Sandbox

Authenticate providers in their own sandbox once:

```bash
locus sandbox claude
locus sandbox codex
```

Expected outcome:

- Claude and Codex credentials are stored in their sandbox environment.
- Later `locus run`, `locus exec`, and other AI commands can execute without host credential exposure.

## Step 5: Choose Model, Run, and Verify Isolation

Pick a model and run with required sandboxing:

```bash
# Claude example
locus config set ai.model claude-sonnet-4-6
locus run <issue-number> --sandbox=require
```

Switch to Codex with the same workflow:

```bash
locus config set ai.model gpt-5.3-codex
locus run <issue-number> --sandbox=require
```

Expected outcome:

- You switch providers only by changing `ai.model`.
- The sandboxing layer stays the same (Docker sandbox + workspace sync + `.sandboxignore` enforcement).

## Unified Interface: Claude and Codex on One Sandboxing Layer

Locus keeps a single command interface across providers:

- Same commands: `locus run`, `locus exec`, `locus review`, `locus iterate`
- Same sandbox control: `locus sandbox`, `locus sandbox status`
- Same safety mode options: default sandboxed behavior, `--sandbox=require`, or explicit `--no-sandbox`

Provider changes do not require a different security setup or different run command structure.

## Troubleshooting

### Startup Failure: Sandbox Cannot Start

Symptoms:

- `Docker sandbox required but not available`
- `Docker is not installed`
- `Docker is not responding`
- `Docker Desktop 4.58+ with sandbox support required`

Fixes:

1. Start Docker Desktop and wait until it is fully initialized.
2. Re-run `docker info` and `docker sandbox ls`.
3. Upgrade Docker Desktop to 4.58+ if `docker sandbox` is unavailable.
4. Use `locus run ... --sandbox=require` during validation so failures are explicit.

### Permission Issue: Docker Access Denied

Symptoms:

- Permission denied on Docker socket or sandbox commands.
- Commands work only with elevated privileges.

Fixes:

1. Confirm your user has permission to access Docker (for Linux, ensure your user is in the Docker group and start a new shell session).
2. Make sure your terminal session matches the user account running Docker Desktop.
3. Re-check with `docker info` before retrying `locus sandbox`.

### Sync Issue: Files Not Appearing as Expected

Symptoms:

- Changes made during a run are not visible where expected.
- Certain files are intentionally missing in sandbox execution.

Fixes:

1. Check `.sandboxignore` for excluded files or directories.
2. Re-run the command; Locus re-syncs workspace content before sandboxed execution.
3. Avoid editing huge generated files continuously during runs; large/high-frequency writes can cause visible sync lag.
4. Verify you are running in the expected repository path (`pwd`) and not a stale worktree.

## Next References

1. [Security & Sandboxing](../concepts/security-sandboxing.md)
2. [locus run](../cli/run.md)
3. [locus exec](../cli/exec.md)
