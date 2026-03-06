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

## Shell Environment with `sandbox-profile.sh`

When you open an interactive shell with `locus sandbox shell <provider>`, Locus automatically sets up the environment by adding common binary directories to `PATH` (node_modules/.bin, .venv/bin, .cargo/bin, go/bin, etc.) and configuring `NODE_PATH`.

If your project needs additional environment customization — extra `PATH` entries, environment variables, shell aliases, or functions — create a `.locus/sandbox-profile.sh` file. Locus sources this file at the end of shell initialization, so your customizations take effect on top of the auto-detected defaults.

### How it works

1. Locus opens a shell inside the provider sandbox.
2. Common bin directories for all ecosystems are auto-detected and added to `PATH`.
3. `NODE_PATH` is configured for sandbox-installed dependencies.
4. If `.locus/sandbox-profile.sh` exists, it is **sourced** (`. <file>`) in the shell context.
5. The interactive shell starts.

### When to use it

- Your project uses tools installed in non-standard locations
- You need project-specific environment variables available in the sandbox shell
- You want shell aliases or helper functions for sandbox debugging
- You have custom SDK paths, compiler flags, or runtime configuration

### Examples

**Custom environment variables and PATH:**

```bash
# .locus/sandbox-profile.sh

# Add project-specific tool to PATH
export PATH="/opt/custom-tools/bin:$PATH"

# Set environment variables for the project
export DATABASE_URL="postgres://localhost:5432/devdb"
export NODE_ENV="development"
export RUST_LOG="debug"
```

**Shell aliases for common tasks:**

```bash
# .locus/sandbox-profile.sh

# Quick shortcuts
alias t='npm test'
alias b='npm run build'
alias lint='npm run lint'

# Project-specific helpers
alias db-reset='psql -f scripts/reset-db.sql'
```

**Multi-language environment setup:**

```bash
# .locus/sandbox-profile.sh

# Python virtualenv activation
[ -f .venv/bin/activate ] && . .venv/bin/activate

# Java/JVM via SDKMAN
export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
export PATH="$JAVA_HOME/bin:$PATH"

# Custom Go workspace
export GOPATH="$HOME/go"
export PATH="$GOPATH/bin:$PATH"
```

### Tips

- This file is **sourced**, not executed as a subprocess — variables and aliases persist in the shell session.
- It only runs during `locus sandbox shell`, not during automated AI agent execution (`locus run`, `locus exec`).
- The working directory is set to your project root when the file is sourced.
- Keep it lightweight — heavy initialization slows down shell startup.

### Difference from `sandbox-setup.sh`

| | `sandbox-setup.sh` | `sandbox-profile.sh` |
|---|---|---|
| **Purpose** | Install toolchains and dependencies | Customize shell environment |
| **When** | During sandbox creation (`locus sandbox`) | During interactive shell (`locus sandbox shell`) |
| **Execution** | Runs as a subprocess (`sh <file>`) | Sourced in shell context (`. <file>`) |
| **Runs as** | Root, non-interactive | Current user, interactive shell |
| **Use for** | `apt-get install`, `pip install`, `cargo build` | `export`, `alias`, `PATH` additions |

---

## Notes

- Sandboxes must be created first with `locus sandbox`.
- If a provider sandbox is missing or not running, subcommands return guidance to recreate it.
- Locus enforces `.sandboxignore` rules when syncing workspace content into sandbox execution.
