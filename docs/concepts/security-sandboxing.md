---
description: Docker sandbox isolation for AI agent execution — architecture, configuration, and troubleshooting.
---

# Security & Sandboxing

Locus can run AI agents inside **Docker Desktop sandboxes** — lightweight microVMs that provide hypervisor-level isolation. This is the recommended way to run AI agents, and it is enabled by default when Docker Desktop 4.58+ is installed.

## What Sandboxing Provides

Each sandbox is a full microVM with:

- **Separate kernel** — the agent runs in its own Linux kernel, isolated from your host OS
- **Filesystem isolation** — only the project workspace is synced into the sandbox via bidirectional file sync
- **Credential protection** — host environment variables, SSH keys, and credentials are not exposed to the agent
- **Network proxy** — outbound traffic goes through Docker's network proxy, preventing direct host network access
- **Resource limits** — each sandbox is a bounded microVM with its own resource allocation

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) **4.58+** with sandbox support
- Verify with: `docker sandbox ls`
- Setup guide: [Sandboxing Setup (Docker-First)](../getting-started/sandboxing-setup.md)

## Default Behavior

| Docker Status | Locus Behavior |
|---------------|----------------|
| Docker 4.58+ installed and running | Agents run inside sandboxes automatically |
| Docker not installed or outdated | Warning printed, agents run unsandboxed |
| Docker not responding | Warning printed, agents run unsandboxed |

## CLI Flags

| Flag | Behavior |
|------|----------|
| *(no flag)* | Auto mode — use sandbox if available, warn and fall back if not |
| `--no-sandbox` | Disable sandboxing; shows interactive safety warning |
| `--sandbox=require` | Require sandbox — exit with error if Docker sandbox is unavailable |

```bash
# Default: auto-sandbox
locus run 42

# Explicitly opt out
locus run 42 --no-sandbox

# Require sandbox (e.g., in CI)
locus run 42 --sandbox=require
```

## Configuration

Add or modify the `sandbox` section in `.locus/config.json`:

```json
{
  "sandbox": {
    "enabled": true,
    "extraWorkspaces": ["/path/to/shared/libs"],
    "readOnlyPaths": ["/path/to/configs"]
  }
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `true` | Enable sandbox by default. Set to `false` to disable. |
| `extraWorkspaces` | string[] | `[]` | Additional host paths synced into the sandbox workspace. |
| `readOnlyPaths` | string[] | `[]` | Host paths mounted as read-only inside the sandbox. |

CLI flags override config: `--no-sandbox` overrides `enabled: true`, and `--sandbox=require` enforces sandboxing regardless of config.

```bash
# Disable sandbox via config
locus config set sandbox.enabled false
```

## Parallel Execution

When running multiple issues in parallel (`locus run 42 43 44`), each issue gets its own isolated sandbox:

```
locus run 42 43 44
  → sandbox "locus-issue-42-<ts>" → agent executes issue 42
  → sandbox "locus-issue-43-<ts>" → agent executes issue 43
  → sandbox "locus-issue-44-<ts>" → agent executes issue 44
```

Each sandbox has its own kernel, synced workspace (the git worktree), and network proxy. The `agent.maxParallel` config limits how many sandboxes run concurrently.

## Lifecycle & Cleanup

Sandboxes are automatically managed:

1. **Created** at the start of each agent execution
2. **Cleaned up** in the `finally` block after execution (success or failure)
3. **Aborted** via `docker sandbox rm` when the user interrupts (SIGINT/SIGTERM)
4. **Stale cleanup** — orphaned `locus-*` sandboxes from previous crashes are removed at the start of each run

## Troubleshooting

For full first-run troubleshooting (startup, permissions, and sync), see [Sandboxing Setup (Docker-First)](../getting-started/sandboxing-setup.md).

### "Docker sandbox not available"

Docker Desktop is either not installed or the version is below 4.58.

**Fix:** Install or upgrade [Docker Desktop](https://www.docker.com/products/docker-desktop/) to 4.58+. Verify with:

```bash
docker sandbox ls
```

### "Docker is not responding"

Docker Desktop is installed but the daemon is not running or not responding within 5 seconds.

**Fix:** Start Docker Desktop and wait for it to initialize. Check `docker info` to verify the daemon is running.

### Sandbox performance

Each sandbox is a lightweight microVM. Resource usage scales with the number of concurrent sandboxes:

- **Single run:** One sandbox — minimal overhead
- **Parallel run:** One sandbox per issue — resource usage proportional to `agent.maxParallel`

If your machine is resource-constrained, reduce `agent.maxParallel`:

```bash
locus config set agent.maxParallel 2
```

### File sync delays

Docker sandboxes use bidirectional file sync between your host workspace and the sandbox. For most projects this is transparent, but very large files or high-frequency writes may experience slight latency.

### Network restrictions

Outbound traffic from the sandbox goes through Docker's network proxy. API calls to GitHub, Anthropic, and OpenAI work transparently. If you use a corporate proxy or VPN, you may need to configure Docker Desktop's proxy settings.
