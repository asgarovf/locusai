/**
 * `locus skills [subcommand]` — Discover and manage agent skills.
 *
 * Subcommands:
 *   locus skills              # alias for `locus skills list`
 *   locus skills list         # list available skills from remote registry
 *   locus skills list --installed  # list locally installed skills
 *   locus skills search <query>   # search skills by name, description, or tags
 *   locus skills install <name>   # install a skill from the registry
 *   locus skills remove <name>    # remove an installed skill
 *   locus skills update [name]    # update installed skill(s) from registry
 *   locus skills info <name>      # show skill metadata and install status
 */

import { type Column, renderTable } from "../display/table.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import {
  hasOrphanedSkillFiles,
  installSkill,
  isSkillInstalled,
  removeSkill,
  SkillInstallError,
} from "../skills/installer.js";
import { computeSkillHash, readLockFile } from "../skills/lock.js";
import {
  fetchRegistry,
  fetchSkillContent,
  findSkillInRegistry,
} from "../skills/registry.js";
import type { RemoteSkillRegistry, SkillLockFile } from "../skills/types.js";
import {
  AGENTS_SKILLS_DIR,
  CLAUDE_SKILLS_DIR,
  REGISTRY_REPO,
} from "../skills/types.js";

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

  process.stderr.write(`${renderTable(columns, rows)}\n\n`);
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
    process.stderr.write(`${yellow("⚠")}  No skills installed.\n`);
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

  process.stderr.write(`${renderTable(columns, rows)}\n\n`);
  process.stderr.write(`  ${dim(`${entries.length} skill(s) installed.`)}\n\n`);
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
    process.stderr.write(
      `${red("✗")} Skill '${bold(name)}' not found in the registry.\n`
    );
    process.stderr.write(
      `  Run ${bold("locus skills list")} to see available skills.\n`
    );
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

  try {
    await installSkill(cwd, name, content, source);
  } catch (err) {
    if (err instanceof SkillInstallError) {
      process.stderr.write(`${red("✗")} ${err.message}\n`);
      process.stderr.write(
        `  To clean up and retry: ${bold(`locus skills remove ${name}`)} then ${bold(`locus skills install ${name}`)}\n`
      );
    } else {
      process.stderr.write(
        `${red("✗")} Unexpected error installing skill '${name}'.\n`
      );
      process.stderr.write(`  ${dim((err as Error).message)}\n`);
    }
    process.exit(1);
  }

  process.stderr.write(
    `\n${green("✓")} Installed skill '${bold(name)}' from ${REGISTRY_REPO}\n`
  );
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
  const installed = isSkillInstalled(cwd, name);
  const orphaned = hasOrphanedSkillFiles(cwd, name);

  if (!installed && !orphaned) {
    process.stderr.write(
      `${red("✗")} Skill '${bold(name)}' is not installed.\n`
    );
    process.stderr.write(
      `  Run ${bold("locus skills list --installed")} to see installed skills.\n`
    );
    process.exit(1);
  }

  await removeSkill(cwd, name);

  if (orphaned) {
    process.stderr.write(
      `${green("✓")} Cleaned up orphaned skill files for '${bold(name)}'\n`
    );
  } else {
    process.stderr.write(`${green("✓")} Removed skill '${bold(name)}'\n`);
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

async function updateSkills(name?: string): Promise<void> {
  const cwd = process.cwd();
  const lockFile = readLockFile(cwd);
  const installed = Object.entries(lockFile.skills);

  if (installed.length === 0) {
    process.stderr.write(`${yellow("⚠")}  No skills installed.\n`);
    process.stderr.write(
      `  Install skills with: ${bold("locus skills install <name>")}\n`
    );
    return;
  }

  // If a name is provided, only update that specific skill
  const targets = name ? installed.filter(([n]) => n === name) : installed;

  if (name && targets.length === 0) {
    process.stderr.write(
      `${red("✗")} Skill '${bold(name)}' is not installed.\n`
    );
    process.stderr.write(
      `  Run ${bold("locus skills list --installed")} to see installed skills.\n`
    );
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

  process.stderr.write("\n");

  let updatedCount = 0;

  for (const [skillName, lockEntry] of targets) {
    const entry = findSkillInRegistry(registry, skillName);

    if (!entry) {
      process.stderr.write(
        `${yellow("⚠")}  '${bold(skillName)}' is no longer in the registry (skipped)\n`
      );
      continue;
    }

    let content: string;
    try {
      content = await fetchSkillContent(entry.path);
    } catch (err) {
      process.stderr.write(
        `${red("✗")} Failed to download skill '${skillName}': ${dim((err as Error).message)}\n`
      );
      continue;
    }

    const newHash = computeSkillHash(content);

    if (newHash === lockEntry.computedHash) {
      process.stderr.write(`  '${cyan(skillName)}' is already up to date\n`);
      continue;
    }

    const source = `${REGISTRY_REPO}/${entry.path}`;
    try {
      await installSkill(cwd, skillName, content, source);
    } catch (err) {
      if (err instanceof SkillInstallError) {
        process.stderr.write(`${red("✗")} ${err.message}\n`);
        process.stderr.write(
          `  To clean up: ${bold(`locus skills remove ${skillName}`)}\n`
        );
      } else {
        process.stderr.write(
          `${red("✗")} Failed to update '${skillName}': ${dim((err as Error).message)}\n`
        );
      }
      continue;
    }
    updatedCount++;

    process.stderr.write(
      `${green("✓")} Updated '${bold(skillName)}' (hash changed)\n`
    );
  }

  process.stderr.write("\n");

  if (updatedCount === 0) {
    process.stderr.write(`  ${dim("All skills are up to date.")}\n\n`);
  } else {
    process.stderr.write(`  ${dim(`${updatedCount} skill(s) updated.`)}\n\n`);
  }
}

// ─── Info ────────────────────────────────────────────────────────────────────

async function infoSkill(name: string): Promise<void> {
  if (!name) {
    process.stderr.write(`${red("✗")} Please specify a skill name.\n`);
    process.stderr.write(`  Usage: ${bold("locus skills info <name>")}\n`);
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
  const cwd = process.cwd();
  const lockFile = readLockFile(cwd);
  const lockEntry = lockFile.skills[name];

  if (!entry && !lockEntry) {
    process.stderr.write(
      `${red("✗")} Skill '${bold(name)}' not found in the registry or locally.\n`
    );
    process.stderr.write(
      `  Run ${bold("locus skills list")} to see available skills.\n`
    );
    process.exit(1);
  }

  process.stderr.write(`\n${bold("Skill Information")}\n\n`);

  if (entry) {
    process.stderr.write(`  ${bold("Name:")}         ${cyan(entry.name)}\n`);
    process.stderr.write(`  ${bold("Description:")}  ${entry.description}\n`);
    process.stderr.write(
      `  ${bold("Platforms:")}    ${entry.platforms.join(", ")}\n`
    );
    process.stderr.write(
      `  ${bold("Tags:")}         ${entry.tags.join(", ")}\n`
    );
    process.stderr.write(`  ${bold("Author:")}       ${entry.author}\n`);
    process.stderr.write(
      `  ${bold("Source:")}       ${REGISTRY_REPO}/${entry.path}\n`
    );
  } else {
    process.stderr.write(`  ${bold("Name:")}         ${cyan(name)}\n`);
    process.stderr.write(`  ${dim("(not found in remote registry)")}\n`);
  }

  process.stderr.write("\n");

  if (lockEntry) {
    process.stderr.write(`  ${bold("Installed:")}    ${green("yes")}\n`);
    process.stderr.write(
      `  ${bold("Hash:")}         ${dim(lockEntry.computedHash.slice(0, 10))}\n`
    );
    process.stderr.write(`  ${bold("Source:")}       ${lockEntry.source}\n`);
  } else {
    process.stderr.write(`  ${bold("Installed:")}    ${dim("no")}\n`);
  }

  process.stderr.write("\n");
}

// ─── Search ──────────────────────────────────────────────────────────────────

async function searchSkills(
  query: string,
  flags: Record<string, string>
): Promise<void> {
  if (!query && !flags.tag) {
    process.stderr.write(`${red("✗")} Please provide a search query.\n`);
    process.stderr.write(
      `  Usage: ${bold("locus skills search <query>")} or ${bold("locus skills search --tag <tag>")}\n`
    );
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

  const tagFilter = flags.tag?.toLowerCase();
  const queryLower = query?.toLowerCase() ?? "";

  const matches = registry.skills.filter((s) => {
    // Tag filter (exact match)
    if (tagFilter) {
      return s.tags.some((t) => t.toLowerCase() === tagFilter);
    }

    // Text search: name, description, tags
    const nameMatch = s.name.toLowerCase().includes(queryLower);
    const descMatch = s.description.toLowerCase().includes(queryLower);
    const tagMatch = s.tags.some((t) => t.toLowerCase().includes(queryLower));
    return nameMatch || descMatch || tagMatch;
  });

  if (matches.length === 0) {
    process.stderr.write(
      `\n${yellow("⚠")}  No skills found matching "${bold(tagFilter || query)}"\n`
    );
    process.stderr.write(
      `  Run ${bold("locus skills list")} to see all available skills.\n\n`
    );
    return;
  }

  const cwd = process.cwd();
  const lockFile = readLockFile(cwd);

  process.stderr.write(
    `\n${bold("Search Results")} for "${cyan(tagFilter || query)}"\n\n`
  );

  const columns: Column[] = [
    { key: "name", header: "Name", minWidth: 12, maxWidth: 24 },
    { key: "description", header: "Description", minWidth: 20, maxWidth: 44 },
    {
      key: "tags",
      header: "Tags",
      minWidth: 10,
      maxWidth: 30,
      format: (val) => dim((val as string[]).join(", ")),
    },
    {
      key: "status",
      header: "Status",
      minWidth: 8,
      maxWidth: 12,
    },
  ];

  const rows = matches.map((s) => ({
    name: cyan(s.name),
    description: s.description,
    tags: s.tags,
    status: s.name in lockFile.skills ? green("installed") : dim("available"),
  }));

  process.stderr.write(`${renderTable(columns, rows)}\n\n`);
  process.stderr.write(
    `  ${dim(`${matches.length} skill(s) found.`)} Install with: ${bold("locus skills install <name>")}\n\n`
  );
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function printSkillsHelp(): void {
  process.stderr.write(`
${bold("Usage:")}
  locus skills <subcommand> [options]

${bold("Subcommands:")}
  ${cyan("list")}              List available skills from the registry
  ${cyan("list")} ${dim("--installed")}   List locally installed skills
  ${cyan("search")} ${dim("<query>")}    Search skills by name, description, or tags
  ${cyan("install")} ${dim("<name>")}    Install a skill from the registry
  ${cyan("remove")} ${dim("<name>")}     Remove an installed skill (alias: ${cyan("uninstall")})
  ${cyan("update")} ${dim("[name]")}     Update installed skill(s) from registry
  ${cyan("info")} ${dim("<name>")}       Show skill metadata and install status

${bold("Examples:")}
  locus skills list                   ${dim("# Browse available skills")}
  locus skills list --installed       ${dim("# Show installed skills")}
  locus skills search "code review"   ${dim("# Search by keyword")}
  locus skills search --tag testing   ${dim("# Search by tag")}
  locus skills install code-review    ${dim("# Install a skill")}
  locus skills remove code-review     ${dim("# Remove a skill")}
  locus skills update                 ${dim("# Update all installed skills")}
  locus skills info code-review       ${dim("# Show skill details")}

`);
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
    case "help": {
      printSkillsHelp();
      break;
    }
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

    case "remove":
    case "uninstall": {
      const skillName = args[1];
      await removeInstalledSkill(skillName);
      break;
    }

    case "update": {
      const skillName = args[1];
      await updateSkills(skillName);
      break;
    }

    case "info": {
      const skillName = args[1];
      await infoSkill(skillName);
      break;
    }

    case "search": {
      const searchQuery = args.slice(1).join(" ");
      await searchSkills(searchQuery, flags);
      break;
    }

    default:
      process.stderr.write(
        `${red("✗")} Unknown subcommand: ${bold(subcommand)}\n`
      );
      process.stderr.write(
        `  Available: ${bold("list")}, ${bold("search")}, ${bold("install")}, ${bold("remove")} (${bold("uninstall")}), ${bold("update")}, ${bold("info")}\n`
      );
      process.exit(1);
  }
}
