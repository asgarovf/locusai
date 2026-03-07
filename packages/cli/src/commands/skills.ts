/**
 * `locus skills [subcommand]` — Discover and manage agent skills.
 *
 * Subcommands:
 *   locus skills              # alias for `locus skills list`
 *   locus skills list         # list available skills from remote registry
 *   locus skills list --installed  # list locally installed skills
 *   locus skills install <name>   # install a skill from the registry
 *   locus skills remove <name>    # remove an installed skill
 */

import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import { renderTable, type Column } from "../display/table.js";
import { installSkill, removeSkill, isSkillInstalled } from "../skills/installer.js";
import { readLockFile } from "../skills/lock.js";
import { fetchRegistry, fetchSkillContent, findSkillInRegistry } from "../skills/registry.js";
import type { RemoteSkillRegistry, SkillLockFile } from "../skills/types.js";
import { REGISTRY_REPO, CLAUDE_SKILLS_DIR, AGENTS_SKILLS_DIR } from "../skills/types.js";

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

// ─── Install ──────────────────────────────────────────────────────────────────

async function installRemoteSkill(name: string): Promise<void> {
  if (!name) {
    process.stderr.write(`${red("✗")} Please specify a skill name.\n`);
    process.stderr.write(`  Usage: ${bold("locus skills install <name>")}\n`);
    process.exit(1);
  }

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

  const entry = findSkillInRegistry(registry, name);
  if (!entry) {
    process.stderr.write(`${red("✗")} Skill '${bold(name)}' not found in the registry.\n`);
    process.stderr.write(`  Run ${bold("locus skills list")} to see available skills.\n`);
    process.exit(1);
  }

  let content: string;
  try {
    content = await fetchSkillContent(entry.path);
  } catch (err) {
    process.stderr.write(`${red("✗")} Failed to download skill '${name}'.\n`);
    process.stderr.write(`  ${dim((err as Error).message)}\n`);
    process.exit(1);
  }

  const cwd = process.cwd();
  const source = `${REGISTRY_REPO}/${entry.path}`;

  await installSkill(cwd, name, content, source);

  process.stderr.write(`\n${green("✓")} Installed skill '${bold(name)}' from ${REGISTRY_REPO}\n`);
  process.stderr.write(`  → ${CLAUDE_SKILLS_DIR}/${name}/SKILL.md\n`);
  process.stderr.write(`  → ${AGENTS_SKILLS_DIR}/${name}/SKILL.md\n\n`);
}

// ─── Remove ──────────────────────────────────────────────────────────────────

async function removeInstalledSkill(name: string): Promise<void> {
  if (!name) {
    process.stderr.write(`${red("✗")} Please specify a skill name.\n`);
    process.stderr.write(`  Usage: ${bold("locus skills remove <name>")}\n`);
    process.exit(1);
  }

  const cwd = process.cwd();

  if (!isSkillInstalled(cwd, name)) {
    process.stderr.write(`${red("✗")} Skill '${bold(name)}' is not installed.\n`);
    process.stderr.write(`  Run ${bold("locus skills list --installed")} to see installed skills.\n`);
    process.exit(1);
  }

  await removeSkill(cwd, name);

  process.stderr.write(`${green("✓")} Removed skill '${bold(name)}'\n`);
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

    case "install": {
      const skillName = args[1];
      await installRemoteSkill(skillName);
      break;
    }

    case "remove": {
      const skillName = args[1];
      await removeInstalledSkill(skillName);
      break;
    }

    default:
      process.stderr.write(
        `${red("✗")} Unknown subcommand: ${bold(subcommand)}\n`
      );
      process.stderr.write(
        `  Available: ${bold("list")}, ${bold("install")}, ${bold("remove")}\n`
      );
      process.exit(1);
  }
}
