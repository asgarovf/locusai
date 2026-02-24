---
description: Self-upgrade the Locus CLI. Check for updates, install the latest version, or target a specific version.
---

# locus upgrade

Check for and install updates to the Locus CLI. Fetches the latest version from the npm registry and upgrades the globally installed package.

## Usage

```bash
locus upgrade [options]
```

---

## Options

| Flag | Description |
|------|-------------|
| `--check` | Check for available updates without installing |
| `--target-version <version>` | Install a specific version instead of the latest |

---

## Behavior

### Default (upgrade to latest)

When called without flags, checks the npm registry for the latest version. If a newer version is available, it is installed globally.

```bash
locus upgrade
```

Steps:

1. Fetches the latest published version from npm.
2. Compares it with the currently installed version.
3. If already up to date, prints a confirmation and exits.
4. If an update is available, displays the version change and installs it.
5. Verifies the installation succeeded.

### Check Only

Use `--check` to see if an update is available without installing it.

```bash
locus upgrade --check
```

Displays the current version, the latest available version, and the `npm install` command to run manually.

### Specific Version

Use `--target-version` to install a specific version (upgrade or downgrade).

```bash
locus upgrade --target-version 2.5.0
```

---

## Version Check

Locus performs a non-blocking background version check every 24 hours when you run any command (except `upgrade` itself). If a newer version is available, a notice is printed after the command completes.

---

## Examples

```bash
# Upgrade to the latest version
locus upgrade

# Check for updates without installing
locus upgrade --check

# Install a specific version
locus upgrade --target-version 3.1.0

# Verify the current version
locus --version
```
