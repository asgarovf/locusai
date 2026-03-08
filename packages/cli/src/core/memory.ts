/**
 * Structured memory directory — read/write/ensure helpers for the
 * 5-category `.locus/memory/` layout.
 */

import { mkdir, readFile, stat, writeFile, appendFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ─── Constants ──────────────────────────────────────────────────────────────

export const MEMORY_DIR = "memory";

export const MEMORY_CATEGORIES: Record<string, { file: string; title: string; description: string }> = {
  architecture: {
    file: "architecture.md",
    title: "Architecture",
    description: "Package ownership, module boundaries, data flow",
  },
  conventions: {
    file: "conventions.md",
    title: "Conventions",
    description: "Code style, naming, patterns",
  },
  decisions: {
    file: "decisions.md",
    title: "Decisions",
    description: "Trade-off rationale: why X over Y",
  },
  preferences: {
    file: "preferences.md",
    title: "Preferences",
    description: "User corrections, rejected approaches",
  },
  debugging: {
    file: "debugging.md",
    title: "Debugging",
    description: "Non-obvious gotchas, environment quirks",
  },
};

// ─── Path Helpers ───────────────────────────────────────────────────────────

/** Returns absolute path to `.locus/memory/`. */
export function getMemoryDir(projectRoot: string): string {
  return join(projectRoot, ".locus", MEMORY_DIR);
}

// ─── Ensure ─────────────────────────────────────────────────────────────────

/** Creates `.locus/memory/` and category files with markdown headers if they don't exist. */
export async function ensureMemoryDir(projectRoot: string): Promise<void> {
  const dir = getMemoryDir(projectRoot);
  await mkdir(dir, { recursive: true });

  for (const category of Object.values(MEMORY_CATEGORIES)) {
    const filePath = join(dir, category.file);
    if (!existsSync(filePath)) {
      const header = `# ${category.title}\n\n${category.description}\n\n`;
      await writeFile(filePath, header, "utf-8");
    }
  }
}

// ─── Read ───────────────────────────────────────────────────────────────────

/** Reads a single category file. Returns empty string if file doesn't exist. */
export async function readMemoryFile(projectRoot: string, category: string): Promise<string> {
  const meta = MEMORY_CATEGORIES[category];
  if (!meta) return "";

  const filePath = join(getMemoryDir(projectRoot), meta.file);
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

/** Concatenates all 5 category files into a single string for prompt injection. */
export async function readAllMemory(projectRoot: string): Promise<string> {
  const parts: string[] = [];

  for (const category of Object.keys(MEMORY_CATEGORIES)) {
    const content = await readMemoryFile(projectRoot, category);
    if (content.trim()) {
      parts.push(content.trim());
    }
  }

  return parts.join("\n\n");
}

/** Synchronous version of readAllMemory — for use in prompt builders that are sync. */
export function readAllMemorySync(projectRoot: string): string {
  const dir = getMemoryDir(projectRoot);
  if (!existsSync(dir)) return "";

  const parts: string[] = [];
  for (const meta of Object.values(MEMORY_CATEGORIES)) {
    const filePath = join(dir, meta.file);
    try {
      const content = readFileSync(filePath, "utf-8").trim();
      if (content) parts.push(content);
    } catch {
      // skip missing files
    }
  }

  return parts.join("\n\n");
}

// ─── Write ──────────────────────────────────────────────────────────────────

/** Appends entries to their respective category files. */
export async function appendMemoryEntries(
  projectRoot: string,
  entries: Array<{ category: string; text: string }>
): Promise<void> {
  const dir = getMemoryDir(projectRoot);

  for (const entry of entries) {
    const meta = MEMORY_CATEGORIES[entry.category];
    if (!meta) continue;

    const filePath = join(dir, meta.file);
    const line = `- **[${meta.title}]**: ${entry.text}\n`;
    await appendFile(filePath, line, "utf-8");
  }
}

// ─── Migration ──────────────────────────────────────────────────────────────

/** Maps LEARNINGS.md category tags to memory category keys. */
const LEARNINGS_CATEGORY_MAP: Record<string, string> = {
  architecture: "architecture",
  conventions: "conventions",
  packages: "architecture", // packages are architectural knowledge
  "user preferences": "preferences",
  debugging: "debugging",
};

/** Resolves a LEARNINGS.md category tag to a memory category key. */
function resolveLearningsCategory(tag: string): string {
  return LEARNINGS_CATEGORY_MAP[tag.toLowerCase()] ?? "conventions";
}

/**
 * Parses `.locus/LEARNINGS.md` entries and distributes them into
 * the structured `.locus/memory/` category files.
 *
 * - Entries matching `- **[Category]**: Text` are extracted
 * - Multi-line entries (text spanning until the next `- **[` marker) are captured
 * - Duplicates (entries already present in target files) are skipped
 * - Original LEARNINGS.md is NOT modified
 */
export async function migrateFromLearnings(
  projectRoot: string
): Promise<{ migrated: number; skipped: number }> {
  const learningsPath = join(projectRoot, ".locus", "LEARNINGS.md");

  let content: string;
  try {
    content = await readFile(learningsPath, "utf-8");
  } catch {
    return { migrated: 0, skipped: 0 };
  }

  if (!content.trim()) {
    return { migrated: 0, skipped: 0 };
  }

  // Parse entries — each starts with `- **[Category]**: `
  const entryPattern = /^- \*\*\[([^\]]+)\]\*\*:\s*/;
  const lines = content.split("\n");
  const parsed: Array<{ category: string; text: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(entryPattern);
    if (!match) continue;

    const tag = match[1];
    const category = resolveLearningsCategory(tag);
    // Text starts after the tag prefix on the same line
    let text = lines[i].slice(match[0].length);

    // Capture multi-line continuation (lines until next entry or EOF)
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].match(entryPattern) || lines[j].trim() === "") break;
      text += `\n${lines[j]}`;
      i = j; // advance outer loop past consumed lines
    }

    parsed.push({ category, text: text.trim() });
  }

  if (parsed.length === 0) {
    return { migrated: 0, skipped: 0 };
  }

  // Ensure memory directory exists
  await ensureMemoryDir(projectRoot);

  // Read existing memory files to check for duplicates
  const existingContent: Record<string, string> = {};
  for (const key of Object.keys(MEMORY_CATEGORIES)) {
    existingContent[key] = await readMemoryFile(projectRoot, key);
  }

  let migrated = 0;
  let skipped = 0;

  for (const entry of parsed) {
    const existing = existingContent[entry.category] ?? "";
    // Simple text match — skip if the entry text already appears in the target file
    if (existing.includes(entry.text)) {
      skipped++;
      continue;
    }

    await appendMemoryEntries(projectRoot, [entry]);
    // Update cache so subsequent duplicates within this batch are caught
    existingContent[entry.category] = (existingContent[entry.category] ?? "") +
      `- **[${MEMORY_CATEGORIES[entry.category]?.title}]**: ${entry.text}\n`;
    migrated++;
  }

  return { migrated, skipped };
}

// ─── Stats ──────────────────────────────────────────────────────────────────

/** Returns metadata per category: entry count, file size, and last modified date. */
export async function getMemoryStats(
  projectRoot: string
): Promise<Record<string, { count: number; size: number; lastModified: Date }>> {
  const dir = getMemoryDir(projectRoot);
  const result: Record<string, { count: number; size: number; lastModified: Date }> = {};

  for (const [key, meta] of Object.entries(MEMORY_CATEGORIES)) {
    const filePath = join(dir, meta.file);
    try {
      const [content, fileStat] = await Promise.all([
        readFile(filePath, "utf-8"),
        stat(filePath),
      ]);
      // Count lines starting with "- " as entries
      const count = content.split("\n").filter((line) => line.startsWith("- ")).length;
      result[key] = {
        count,
        size: fileStat.size,
        lastModified: fileStat.mtime,
      };
    } catch {
      result[key] = { count: 0, size: 0, lastModified: new Date(0) };
    }
  }

  return result;
}
