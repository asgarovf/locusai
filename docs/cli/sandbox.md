---
description: Create and manage provider Docker sandboxes, including auth, package installs, command execution, shell access, and logs.
---

# locus sandbox

Manage Docker-backed provider sandboxes used by Locus execution.

## Usage

```bash
locus sandbox
locus sandbox <subcommand> [options]
```

---

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `locus sandbox` | Create provider sandboxes (Claude + Codex) and enable sandbox mode |
| `locus sandbox claude` | Open an interactive Claude session in the Claude sandbox (for auth) |
| `locus sandbox codex` | Open an interactive Codex session in the Codex sandbox (for auth) |
| `locus sandbox install <package...>` | Install global npm package(s) inside sandbox(es) |
| `locus sandbox exec <provider> -- <command...>` | Run a command inside a provider sandbox |
| `locus sandbox shell <provider>` | Open an interactive shell (`sh`) in a provider sandbox |
| `locus sandbox logs <provider>` | Show Docker sandbox logs for a provider sandbox |
| `locus sandbox status` | Show configured sandbox names and running state |
| `locus sandbox rm` | Remove provider sandboxes and disable sandbox mode |

---

## Providers

Provider values:

- `claude`
- `codex`
- `all` (supported by `install` only)

---

## Typical Setup Flow

```bash
# 1) Create provider sandboxes and enable sandbox mode
locus sandbox

# 2) Authenticate provider CLIs inside their own sandboxes
locus sandbox claude
locus sandbox codex

# 3) Optional: install additional CLI tools inside sandboxes
locus sandbox install bun
```

---

## install

Install one or more npm packages globally in sandbox environments.

```bash
locus sandbox install <package...> [--provider claude|codex|all]
```

Examples:

```bash
# Install in all configured provider sandboxes
locus sandbox install bun

# Install in only one provider sandbox
locus sandbox install bun --provider codex

# Install multiple packages
locus sandbox install bun pnpm --provider all
```

---

## exec

Run a command inside a provider sandbox (working directory is set to your project root).

```bash
locus sandbox exec <provider> -- <command...>
```

Examples:

```bash
locus sandbox exec codex -- bun --version
locus sandbox exec claude -- node -v
```

---

## shell

Open an interactive shell in a provider sandbox.

```bash
locus sandbox shell <provider>
```

Example:

```bash
locus sandbox shell codex
```

---

## logs

Show logs for a provider sandbox.

```bash
locus sandbox logs <provider> [--follow|-f] [--tail <lines>|--tail=<lines>]
```

Examples:

```bash
# Show recent logs
locus sandbox logs codex

# Stream logs live
locus sandbox logs codex --follow

# Show only last 200 lines
locus sandbox logs claude --tail 200
```

---

## status

Show whether sandbox mode is enabled, configured sandbox names, and running status for each provider.

```bash
locus sandbox status
```

---

## rm

Remove all configured provider sandboxes and disable sandbox mode.

```bash
locus sandbox rm
```

---

## Notes

- Sandboxes must be created first with `locus sandbox`.
- If a provider sandbox is missing or not running, subcommands return guidance to recreate it.
- Locus enforces `.sandboxignore` rules when syncing workspace content into sandbox execution.
