// ---------------------------------------------------------------------------
// Skills Marketplace – lock file utilities
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { SkillLockFile } from "./types.js";
import { SKILLS_LOCK_FILENAME } from "./types.js";

const DEFAULT_LOCK_FILE: SkillLockFile = { version: 1, skills: {} };

/**
 * Read the skills lock file from the project root.
 * Returns a default empty lock file if it doesn't exist.
 */
export function readLockFile(projectRoot: string): SkillLockFile {
  const filePath = join(projectRoot, SKILLS_LOCK_FILENAME);

  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as SkillLockFile;
  } catch {
    return { ...DEFAULT_LOCK_FILE, skills: {} };
  }
}

/**
 * Write the skills lock file to the project root as formatted JSON.
 */
export function writeLockFile(
  projectRoot: string,
  lockFile: SkillLockFile
): void {
  const filePath = join(projectRoot, SKILLS_LOCK_FILENAME);
  writeFileSync(filePath, JSON.stringify(lockFile, null, 2) + "\n", "utf-8");
}

/**
 * Compute a SHA-256 hex digest of the given content string.
 */
export function computeSkillHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
