/**
 * `locus skills [subcommand]` — Discover and manage agent skills.
 *
 * Subcommands:
 *   locus skills              # alias for `locus skills list`
 *   locus skills list         # list available skills from remote registry
 *   locus skills list --installed  # list locally installed skills
 */

import { bold, cyan, dim, red, yellow } from "../display/terminal.js";
import { renderTable, type Column } from "../display/table.js";
import { readLockFile } from "../skills/lock.js";
import { fetchRegistry } from "../skills/registry.js";
import type { RemoteSkillRegistry, SkillLockFile } from "../skills/types.js";

// ─── List (remote) ───────────────────────────────────────────────────────────

async function listRemoteSkills(): Promise<void> {
  let registry: RemoteSkillRegistry;
  try {
    registry = await fetchRegistry();
  } catch (err) {
    process.stderr.write(
      `${red("✗")} Failed to fetch skills registry. Check your internet connection.\n`
    );
    process.stderr.write(`  ${dim((err as Error).message)}\n`);
    process.exit(1);
  }

  if (registry.skills.length === 0) {
    process.stderr.write(`${dim("No skills available in the registry.")}\n`);
    return;
  }

  process.stderr.write(`\n${bold("Available Skills")}\n\n`);

  const columns: Column[] = [
    { key: "name", header: "Name", minWidth: 12, maxWidth: 24 },
    { key: "description", header: "Description", minWidth: 20, maxWidth: 50 },
    {
      key: "platforms",
      header: "Platforms",
      minWidth: 10,
      maxWidth: 30,
      format: (val) => dim((val as string[]).join(", ")),
    },
  ];

  const rows = registry.skills.map((s) => ({
    name: cyan(s.name),
    description: s.description,
    platforms: s.platforms,
  }));

  process.stderr.write(renderTable(columns, rows) + "\n\n");
  process.stderr.write(
    `  ${dim(`${registry.skills.length} skill(s) available.`)} Install with: ${bold("locus skills install <name>")}\n\n`
  );
}

// ─── List (installed) ────────────────────────────────────────────────────────

function listInstalledSkills(): void {
  const cwd = process.cwd();
  const lockFile: SkillLockFile = readLockFile(cwd);
  const entries = Object.entries(lockFile.skills);

  if (entries.length === 0) {
    process.stderr.write(
      `${yellow("⚠")}  No skills installed.\n`
    );
    process.stderr.write(
      `  Browse available skills with: ${bold("locus skills list")}\n`
    );
    return;
  }

  process.stderr.write(`\n${bold("Installed Skills")}\n\n`);

  const columns: Column[] = [
    { key: "name", header: "Name", minWidth: 12, maxWidth: 24 },
    { key: "source", header: "Source", minWidth: 10, maxWidth: 40 },
    {
      key: "hash",
      header: "Hash",
      minWidth: 10,
      maxWidth: 16,
      format: (val) => dim((val as string).slice(0, 12)),
    },
  ];

  const rows = entries.map(([name, entry]) => ({
    name: cyan(name),
    source: entry.source,
    hash: entry.computedHash,
  }));

  process.stderr.write(renderTable(columns, rows) + "\n\n");
  process.stderr.write(
    `  ${dim(`${entries.length} skill(s) installed.`)}\n\n`
  );
}

// ─── Command ─────────────────────────────────────────────────────────────────

/**
 * Manage agent skills.
 *
 * @param args  Positional arguments after `skills` (first is the subcommand).
 * @param flags Key-value string flags.
 */
export async function skillsCommand(
  args: string[],
  flags: Record<string, string>
): Promise<void> {
  const subcommand = args[0] ?? "list";

  switch (subcommand) {
    case "list": {
      const isInstalled =
        flags.installed !== undefined || args.includes("--installed");
      if (isInstalled) {
        listInstalledSkills();
      } else {
        await listRemoteSkills();
      }
      break;
    }

    default:
      process.stderr.write(
        `${red("✗")} Unknown subcommand: ${bold(subcommand)}\n`
      );
      process.stderr.write(
        `  Available: ${bold("list")}\n`
      );
      process.exit(1);
  }
}
