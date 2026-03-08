---
description: Install, manage, and troubleshoot agent skills from the Locus skills registry.
---

# Skills

Skills are reusable AI agent capabilities that extend what Locus can do. They are community-contributed and hosted in the [Locus skills registry](https://github.com/asgarovf/locusai).

## Quick Start

```bash
# Browse available skills
locus skills list

# Install a skill
locus skills install code-review

# See installed skills
locus skills list --installed

# Get details about a skill
locus skills info code-review
```

## Commands

| Command | Description |
|---------|-------------|
| `locus skills list` | List available skills from the registry |
| `locus skills list --installed` | List locally installed skills |
| `locus skills install <name>` | Install a skill from the registry |
| `locus skills remove <name>` | Remove an installed skill |
| `locus skills uninstall <name>` | Alias for `remove` |
| `locus skills update [name]` | Update all or a specific installed skill |
| `locus skills info <name>` | Show skill metadata and install status |

## How Installation Works

When you run `locus skills install <name>`, Locus performs an **atomic install** to ensure your project is never left in a broken state:

1. **Download** — The skill content is fetched from the remote registry.
2. **Stage** — Files are written to a temporary directory first (not your project).
3. **Validate** — Content is verified (non-empty, hash integrity check).
4. **Write** — Staged files are moved to their final locations:
   - `.claude/skills/<name>/SKILL.md`
   - `.agents/skills/<name>/SKILL.md`
5. **Register** — The skill is recorded in `skills-lock.json` with its content hash.

If **any step fails**, all partial files are automatically cleaned up. Your project stays in the same state it was before the install attempt.

## Recovery & Rollback

### Failed Install

If an install fails (network error, disk full, permissions), Locus automatically cleans up. The error message will tell you which step failed:

```
✗ Failed to install 'my-skill' during writing skill files to project: ENOSPC: no space left on device
  To clean up and retry: locus skills remove my-skill then locus skills install my-skill
```

Simply fix the underlying issue (free disk space, fix permissions) and retry `locus skills install <name>`.

### Broken or Orphaned Installs

If a skill is in a broken state (files on disk but not registered, or vice versa), `locus skills remove` will clean up all traces:

```bash
# Removes both directories AND the lock file entry, even for broken installs
locus skills remove my-skill
```

This works regardless of whether the skill is fully installed, partially installed, or only has orphaned files on disk.

### Manual Recovery

If you need to manually clean up:

```bash
# Remove skill directories
rm -rf .claude/skills/<name> .agents/skills/<name>

# Then remove the entry from skills-lock.json (if present)
# Edit skills-lock.json and delete the skill's entry from the "skills" object
```

## Lock File

`skills-lock.json` at your project root tracks all installed skills:

```json
{
  "version": 1,
  "skills": {
    "code-review": {
      "source": "asgarovf/locusai/skills/code-review/SKILL.md",
      "sourceType": "github",
      "computedHash": "a0d866..."
    }
  }
}
```

The `computedHash` is a SHA-256 digest of the skill content, used to detect when updates are available.

## Updating Skills

```bash
# Update all installed skills
locus skills update

# Update a specific skill
locus skills update code-review
```

Locus compares the local hash against the remote registry. Only skills with changed content are re-downloaded and updated.
