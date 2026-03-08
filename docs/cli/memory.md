---
description: Manage the structured memory system. List, search, view stats, reset, and migrate accumulated project learnings.
---

# locus memory

Manage the structured memory system that stores reusable lessons learned during development. Memory is organized into five categories and persists across sessions, helping AI agents avoid repeating mistakes and follow established patterns.

## Usage

```bash
locus memory list [--category <name>]    # List all memory entries
locus memory search <query>              # Search entries by keyword
locus memory stats                       # Show per-category statistics
locus memory reset [--confirm]           # Clear all entries (preserve headers)
locus memory migrate                     # Migrate legacy LEARNINGS.md → memory/
```

---

## Categories

Memory entries are organized into five category files in `.locus/memory/`:

| Category | File | What It Captures |
|----------|------|-----------------|
| `architecture` | `architecture.md` | Package ownership, module boundaries, data flow |
| `conventions` | `conventions.md` | Code style, naming, patterns |
| `decisions` | `decisions.md` | Trade-off rationale: why X over Y |
| `preferences` | `preferences.md` | User corrections, rejected approaches |
| `debugging` | `debugging.md` | Non-obvious gotchas, environment quirks |

---

## Subcommands

### List Entries

Display all memory entries, grouped by category.

```bash
locus memory list
locus memory list --category architecture
```

| Flag | Description |
|------|-------------|
| `--category <name>` | Filter to a specific category |

### Search Entries

Case-insensitive keyword search across all categories.

```bash
locus memory search "sandbox"
locus memory search "docker"
```

Returns matching entries grouped by category with match count.

### View Statistics

Show per-category entry counts, file sizes, and last modification dates.

```bash
locus memory stats
```

### Reset Memory

Clear all entries while preserving category file headers.

```bash
locus memory reset              # Interactive confirmation
locus memory reset --confirm    # Skip confirmation
```

| Flag | Description |
|------|-------------|
| `--confirm` | Skip interactive confirmation |

### Migrate from LEARNINGS.md

One-way migration from the legacy `.locus/LEARNINGS.md` format to the structured memory directory. The legacy file is automatically deleted after migration.

```bash
locus memory migrate
```

- Parses entries matching `- **[Category]**: Text` from `LEARNINGS.md`
- Maps old category tags to new category files automatically
- Deduplicates entries (skips if already present)
- Deletes `LEARNINGS.md` after successful migration

---

## Auto-Capture

Memory entries are also captured automatically after agent execution sessions and REPL conversations. The auto-capture system:

1. Formats the session transcript
2. Uses AI to extract reusable lessons (architectural patterns, constraints, corrections)
3. Deduplicates against existing memory
4. Appends new entries to the appropriate category files

This runs in the background and does not block execution.

---

## Storage

Memory files live in `.locus/memory/` and are tracked in git (excluded from `.gitignore`), so the entire team benefits from accumulated context.

```
.locus/memory/
├── architecture.md
├── conventions.md
├── decisions.md
├── preferences.md
└── debugging.md
```

---

## Examples

```bash
# See all memory entries
locus memory list

# Find entries about Docker or sandboxing
locus memory search "docker"

# Check how many entries exist per category
locus memory stats

# Migrate from legacy LEARNINGS.md (auto-deletes after migration)
locus memory migrate

# Clear all memory and start fresh
locus memory reset --confirm
```
