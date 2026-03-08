/**
 * `locus memory` — Inspect, search, and manage structured memory.
 *
 * Subcommands:
 *   locus memory list [--category <name>]   List all memory entries
 *   locus memory search <query>             Search entries by keyword
 *   locus memory stats                      Show per-category statistics
 *   locus memory reset [--confirm]          Clear all entries (preserve headers)
 *   locus memory migrate                    Migrate LEARNINGS.md → memory/
 */

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import {
  getMemoryDir,
  getMemoryStats,
  MEMORY_CATEGORIES,
  migrateFromLearnings,
  readMemoryFile,
} from "../core/memory.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";

// ─── Help ────────────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stderr.write(`
${bold("locus memory")} — Inspect, search, and manage structured memory

${bold("Usage:")}
  locus memory list [--category <name>]   List all memory entries
  locus memory search <query>             Search entries by keyword
  locus memory stats                      Show per-category statistics
  locus memory reset [--confirm]          Clear all entries (preserve headers)
  locus memory migrate                    Migrate LEARNINGS.md → memory/

${bold("Categories:")}
  architecture, conventions, decisions, preferences, debugging

${bold("Examples:")}
  locus memory list                       ${dim("# Show all entries")}
  locus memory list --category debugging  ${dim("# Show only debugging entries")}
  locus memory search "sandbox"           ${dim("# Search for 'sandbox'")}
  locus memory stats                      ${dim("# Show entry counts and sizes")}
  locus memory reset --confirm            ${dim("# Clear all entries")}
  locus memory migrate                    ${dim("# Run LEARNINGS.md migration")}
`);
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

export async function memoryCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const subcommand = args[0];

  if (!subcommand || subcommand === "help") {
    printHelp();
    return;
  }

  // Check if memory directory exists
  const memoryDir = getMemoryDir(projectRoot);
  if (!existsSync(memoryDir) && subcommand !== "migrate") {
    process.stderr.write(
      `${red("✗")} Memory directory not found at ${dim(".locus/memory/")}\n`
    );
    process.stderr.write(
      `  Run ${bold("locus init")} to create the memory directory.\n`
    );
    process.exit(1);
  }

  switch (subcommand) {
    case "list":
      await handleList(projectRoot, args.slice(1));
      break;
    case "search":
      await handleSearch(projectRoot, args.slice(1));
      break;
    case "stats":
      await handleStats(projectRoot);
      break;
    case "reset":
      await handleReset(projectRoot, args.slice(1));
      break;
    case "migrate":
      await handleMigrate(projectRoot);
      break;
    default:
      process.stderr.write(
        `${red("✗")} Unknown subcommand: ${bold(subcommand)}\n`
      );
      process.stderr.write(
        `  Run ${bold("locus memory help")} for available subcommands.\n`
      );
      process.exit(1);
  }
}

// ─── list ────────────────────────────────────────────────────────────────────

async function handleList(projectRoot: string, args: string[]): Promise<void> {
  // Parse --category flag
  let categoryFilter: string | undefined;
  const catIdx = args.indexOf("--category");
  if (catIdx !== -1) {
    categoryFilter = args[catIdx + 1];
    if (!categoryFilter || !MEMORY_CATEGORIES[categoryFilter]) {
      const valid = Object.keys(MEMORY_CATEGORIES).join(", ");
      process.stderr.write(
        `${red("✗")} Invalid category. Valid categories: ${valid}\n`
      );
      process.exit(1);
    }
  }

  const categories = categoryFilter
    ? [categoryFilter]
    : Object.keys(MEMORY_CATEGORIES);

  let totalEntries = 0;

  for (const category of categories) {
    const content = await readMemoryFile(projectRoot, category);
    const entries = parseEntries(content);

    if (entries.length === 0) continue;

    const meta = MEMORY_CATEGORIES[category];
    process.stderr.write(
      `\n${bold(cyan(meta.title))} ${dim(`(${meta.description})`)}\n`
    );

    for (const entry of entries) {
      process.stderr.write(`  ${entry}\n`);
    }

    totalEntries += entries.length;
  }

  if (totalEntries === 0) {
    process.stderr.write(`\n${dim("No memory entries found.")}\n`);
  } else {
    process.stderr.write(`\n${dim(`${totalEntries} entries total`)}\n`);
  }
}

// ─── search ──────────────────────────────────────────────────────────────────

async function handleSearch(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const query = args.join(" ").trim();
  if (!query) {
    process.stderr.write(`${red("✗")} Usage: locus memory search <query>\n`);
    process.exit(1);
  }

  const queryLower = query.toLowerCase();
  let matchCount = 0;

  for (const [category, meta] of Object.entries(MEMORY_CATEGORIES)) {
    const content = await readMemoryFile(projectRoot, category);
    const entries = parseEntries(content);

    const matches = entries.filter((entry) =>
      entry.toLowerCase().includes(queryLower)
    );

    if (matches.length === 0) continue;

    process.stderr.write(`\n${bold(cyan(meta.title))}\n`);

    for (const entry of matches) {
      // Highlight matching term with bold
      const highlighted = highlightMatch(entry, query);
      process.stderr.write(`  ${highlighted}\n`);
    }

    matchCount += matches.length;
  }

  if (matchCount === 0) {
    process.stderr.write(`\n${dim("No matches found for")} "${query}"\n`);
  } else {
    process.stderr.write(
      `\n${green(`${matchCount} match${matchCount === 1 ? "" : "es"}`)} found for "${query}"\n`
    );
  }
}

// ─── stats ───────────────────────────────────────────────────────────────────

async function handleStats(projectRoot: string): Promise<void> {
  const stats = await getMemoryStats(projectRoot);

  process.stderr.write(`\n${bold("Memory Statistics")}\n\n`);

  let totalEntries = 0;
  let totalSize = 0;

  for (const [key, meta] of Object.entries(MEMORY_CATEGORIES)) {
    const s = stats[key];
    const countStr = String(s.count).padStart(3);
    const sizeStr = formatSize(s.size).padStart(8);
    const dateStr =
      s.size > 0
        ? dim(
            s.lastModified.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          )
        : dim("—");

    const icon = s.count > 0 ? green("●") : dim("○");
    process.stderr.write(
      `  ${icon} ${cyan(meta.title.padEnd(14))} ${countStr} entries  ${sizeStr}  ${dateStr}\n`
    );

    totalEntries += s.count;
    totalSize += s.size;
  }

  process.stderr.write(
    `\n  ${bold("Total:")} ${totalEntries} entries, ${formatSize(totalSize)}\n`
  );

  // Check migration status
  const learningsPath = join(projectRoot, ".locus", "LEARNINGS.md");
  const hasMigrated = !existsSync(learningsPath) || totalEntries > 0;
  process.stderr.write(
    `  ${bold("Migration:")} ${hasMigrated ? green("done") : yellow("pending — run `locus memory migrate`")}\n`
  );

  process.stderr.write("\n");
}

// ─── reset ───────────────────────────────────────────────────────────────────

async function handleReset(projectRoot: string, args: string[]): Promise<void> {
  const confirmed = args.includes("--confirm");

  if (!confirmed) {
    // Interactive confirmation
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `${yellow("⚠")} This will clear all memory entries. Continue? (y/N) `,
        (ans) => {
          rl.close();
          resolve(ans.trim().toLowerCase());
        }
      );
    });

    if (answer !== "y" && answer !== "yes") {
      process.stderr.write(`${dim("Cancelled.")}\n`);
      return;
    }
  }

  // Get current counts before clearing
  const stats = await getMemoryStats(projectRoot);
  const memoryDir = getMemoryDir(projectRoot);

  let totalCleared = 0;

  for (const [key, meta] of Object.entries(MEMORY_CATEGORIES)) {
    const count = stats[key].count;
    const filePath = join(memoryDir, meta.file);
    const header = `# ${meta.title}\n\n${meta.description}\n\n`;
    await writeFile(filePath, header, "utf-8");

    if (count > 0) {
      process.stderr.write(
        `  ${dim("○")} ${meta.title}: cleared ${count} entries\n`
      );
      totalCleared += count;
    }
  }

  if (totalCleared > 0) {
    process.stderr.write(
      `\n${green("✓")} Cleared ${totalCleared} entries (file headers preserved)\n`
    );
  } else {
    process.stderr.write(`${dim("No entries to clear.")}\n`);
  }
}

// ─── migrate ─────────────────────────────────────────────────────────────────

async function handleMigrate(projectRoot: string): Promise<void> {
  const learningsPath = join(projectRoot, ".locus", "LEARNINGS.md");

  if (!existsSync(learningsPath)) {
    process.stderr.write(
      `${dim("○")} No LEARNINGS.md found — nothing to migrate.\n`
    );
    return;
  }

  process.stderr.write(`Migrating entries from LEARNINGS.md...\n`);
  const result = await migrateFromLearnings(projectRoot);

  if (result.migrated > 0) {
    process.stderr.write(
      `${green("✓")} Migrated ${result.migrated} entries to .locus/memory/\n`
    );
  }
  if (result.skipped > 0) {
    process.stderr.write(
      `${dim("○")} Skipped ${result.skipped} duplicate entries\n`
    );
  }
  if (result.migrated === 0 && result.skipped === 0) {
    process.stderr.write(
      `${dim("○")} No entries found in LEARNINGS.md to migrate.\n`
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extracts bullet-point entries (lines starting with "- ") from file content. */
function parseEntries(content: string): string[] {
  if (!content) return [];
  return content.split("\n").filter((line) => line.startsWith("- "));
}

/** Case-insensitive highlight of a search term using bold. */
function highlightMatch(text: string, query: string): string {
  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  return text.replace(regex, (match) => bold(match));
}

/** Escapes special regex characters. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Formats bytes into human-readable size. */
function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}
