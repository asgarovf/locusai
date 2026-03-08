/**
 * Structured memory directory — read/write/ensure helpers for the
 * 5-category `.locus/memory/` layout.
 */

import { mkdir, readFile, stat, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
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
