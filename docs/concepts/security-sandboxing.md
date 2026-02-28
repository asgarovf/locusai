---
description: Security model for Docker sandbox isolation in Locus, including `.env` protection, `.sandboxignore` behavior, and sync boundaries.
---

# Security & Sandboxing

Locus can run AI agents inside **Docker Desktop sandboxes** (Docker 4.58+). This page focuses on the security model: what is protected by default, what is not, and how to configure file exclusions safely.

## Threat Model

Sandboxing is designed to reduce accidental data exposure during AI execution.

Primary risks this model addresses:

- AI agent reads host secrets from local files.
- AI agent accesses host-level credentials or system paths.
- Sensitive files are unintentionally included in model context during code operations.

Out of scope risks you still need to manage:

- Running with `--no-sandbox` (or unsandboxed fallback in auto mode) removes sandbox protections.
- Secrets committed to tracked repository files are still visible in the synced workspace.
- Misconfigured `.sandboxignore` rules can re-include sensitive files.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) **4.58+** with sandbox support
- Verify with: `docker sandbox ls`
- Setup guide: [Sandboxing Setup (Docker-First)](../getting-started/sandboxing-setup.md)

## Default Security Behavior

| Condition | Behavior | Security Impact |
|-----------|----------|-----------------|
| Docker sandbox available | Runs in sandbox automatically | Isolated execution with workspace sync controls |
| Docker unavailable (default auto mode) | Warns and runs unsandboxed | Agent has host-level access; lower security |
| `--sandbox=require` | Fails if sandbox unavailable | Prevents accidental insecure fallback |
| `--no-sandbox` | Runs unsandboxed after warning | Explicitly bypasses isolation |

## `.env` and Secret File Protection

When you run `locus init`, Locus generates a default `.sandboxignore` with secret-focused exclusions, including:

```text
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.pfx
*.keystore
credentials.json
service-account*.json
.aws/
.gcp/
.azure/
```

What this means in practice:

- `.env` and `.env.*` are excluded from sandbox execution by default.
- `!.env.example` is intentionally re-included for template/documentation use.
- Cloud credential directories and common key/cert files are excluded by default.

Important caveat:

- These protections depend on `.sandboxignore` rules staying intact. If your team removes or weakens these patterns, sensitive files can be synced and exposed to agent actions.

## `.sandboxignore` Syntax and Precedence

Locus uses `.gitignore`-style pattern rules in `.sandboxignore`.

Supported rule forms:

- `# comment` for comments.
- `pattern` to exclude matching files.
- `dir/` to exclude matching directories.
- `!pattern` to negate a previous exclusion (re-include matches).

Precedence behavior:

- Patterns are evaluated as exclusions plus negated exceptions.
- Negation rules (`!`) are treated as keep rules against broader exclusion patterns.
- If no positive exclusion patterns exist, nothing is removed.

Example:

```text
# Exclude all env files
.env.*

# But keep public sample env
!.env.example

# Exclude full secrets directory
secrets/
```

## Practical `.sandboxignore` Examples

Use these as a starting baseline for most teams:

```text
# Environment and local config
.env
.env.*
!.env.example

# Secret material
*.pem
*.key
*.p12
*.pfx
*.kubeconfig

# Cloud and infra credentials
.aws/
.gcp/
.azure/
.terraform/

# Local runtime state
*.sqlite
*.db
```

Unsafe patterns to avoid:

- `!.env` (re-includes production/local env files)
- `!*.pem` (re-includes private keys)
- Removing cloud credential directory exclusions without compensating controls

## Automatic Sync Boundaries

Locus sync behavior in sandbox mode:

- **Workspace scope:** the active project workspace is synced between host and sandbox.
- **Direction:** sync is bidirectional (changes from sandboxed execution come back to your workspace).
- **Timing:** sync occurs during sandboxed command execution and `.sandboxignore` is enforced before agent execution steps.
- **Exclusions:** files matching `.sandboxignore` patterns are removed from sandbox-visible workspace content.

What does *not* sync by default:

- Files excluded by `.sandboxignore`.
- Host paths outside the configured workspace scope.

## Safe vs Unsafe Patterns

| Pattern | Example | Risk Level |
|--------|---------|------------|
| Safe | Keep `.env`, keys, and cloud credential dirs excluded in `.sandboxignore` | Low |
| Safe | Use `--sandbox=require` in CI and production automation | Low |
| Unsafe | Use auto mode in environments where Docker may not be running | Medium |
| Unsafe | Run with `--no-sandbox` for normal development workflows | High |
| Unsafe | Store real credentials in tracked repo files | High |

## Team Security Checklist

Use this checklist before rolling out sandboxed AI workflows:

- Docker Desktop 4.58+ is installed and `docker sandbox ls` succeeds on contributor machines.
- CI and critical automations use `--sandbox=require` to block insecure fallback.
- `.sandboxignore` is version-controlled and includes `.env`, credential files, and cloud config directories.
- `.env.example` contains placeholders only (no real secrets).
- Real secrets are stored in secret managers or local-only files, never tracked source files.
- Team reviews `.sandboxignore` changes in PRs as security-sensitive changes.

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

# Require sandbox (recommended for CI)
locus run 42 --sandbox=require
```

## Parallel Execution and Lifecycle

When running multiple issues in parallel (`locus run 42 43 44`), each issue gets its own isolated sandbox:

```text
locus run 42 43 44
  -> sandbox "locus-issue-42-<ts>" -> agent executes issue 42
  -> sandbox "locus-issue-43-<ts>" -> agent executes issue 43
  -> sandbox "locus-issue-44-<ts>" -> agent executes issue 44
```

Sandboxes are automatically managed:

1. Created at the start of each agent execution.
2. Cleaned up after execution (success or failure).
3. Removed on interruption (SIGINT/SIGTERM).
4. Stale `locus-*` sandboxes are cleaned up at the start of new runs.

## Troubleshooting

For full setup and operational troubleshooting (startup, permissions, and sync), see [Sandboxing Setup (Docker-First)](../getting-started/sandboxing-setup.md).

### "Docker sandbox not available"

Docker Desktop is missing or below 4.58.

**Fix:** Upgrade Docker Desktop and verify:

```bash
docker sandbox ls
```

### "Docker is not responding"

Docker Desktop is installed but daemon is unavailable.

**Fix:** Start Docker Desktop, wait for full initialization, then run:

```bash
docker info
```

### File sync delays

Large files or high-frequency writes can cause visible sync latency. Re-run after writes settle and keep large generated artifacts out of active loops.
