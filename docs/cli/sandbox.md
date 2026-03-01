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
| `locus sandbox` | Select a provider and create its sandbox |
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
# 1) Select a provider and create its sandbox
locus sandbox

# 2) Authenticate the provider CLI inside its sandbox
locus sandbox claude   # or: locus sandbox codex

# 3) Optional: add the other provider by running locus sandbox again
locus sandbox

# 4) Optional: install additional CLI tools inside sandboxes
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

## Custom Setup with `sandbox-setup.sh`

Locus automatically runs `.locus/sandbox-setup.sh` inside each newly created sandbox after dependency installation. This hook lets you install additional toolchains, set environment variables, or perform any project-specific setup that the sandbox needs.

For JavaScript/TypeScript projects, Locus already handles package installation automatically. The setup script is most useful for non-JS projects or when you need extra tools beyond what the package manager provides.

### How it works

1. After creating a sandbox, Locus detects your project ecosystem and installs JS dependencies if applicable.
2. If `.locus/sandbox-setup.sh` exists, Locus runs it inside the sandbox with `sh`.
3. If no setup script exists and the project is non-JS, Locus prints a warning suggesting you create one.

### Examples

**Python project:**

```bash
#!/bin/sh
# .locus/sandbox-setup.sh

# Install Python and pip
apt-get update && apt-get install -y python3 python3-pip python3-venv

# Create and activate virtual environment
python3 -m venv .venv
. .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Rust project:**

```bash
#!/bin/sh
# .locus/sandbox-setup.sh

# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"

# Build the project
cargo build
```

**Go project:**

```bash
#!/bin/sh
# .locus/sandbox-setup.sh

# Install Go
apt-get update && apt-get install -y golang-go

# Download dependencies
go mod download
```

**JavaScript project with extra system dependencies:**

```bash
#!/bin/sh
# .locus/sandbox-setup.sh

# Install system libraries needed for native modules
apt-get update && apt-get install -y libcairo2-dev libjpeg-dev libpango1.0-dev

# Install global tools not covered by package.json
npm install -g turbo playwright
npx playwright install --with-deps chromium
```

**Multi-language monorepo:**

```bash
#!/bin/sh
# .locus/sandbox-setup.sh

# Python services
apt-get update && apt-get install -y python3 python3-pip
pip install -r services/api/requirements.txt

# Additional JS tooling
npm install -g turbo

# Shared build tools
apt-get install -y protobuf-compiler
```

### Tips

- Keep the script idempotent — it may be re-run via `locus sandbox setup`.
- The script runs as root inside the sandbox, so `sudo` is not needed.
- The working directory is set to your project root.
- Use `set -e` at the top if you want the script to fail fast on errors.

---

## Notes

- Sandboxes must be created first with `locus sandbox`.
- If a provider sandbox is missing or not running, subcommands return guidance to recreate it.
- Locus enforces `.sandboxignore` rules when syncing workspace content into sandbox execution.
