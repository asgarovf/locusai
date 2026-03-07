// ---------------------------------------------------------------------------
// Skills Marketplace – skill installer (install / remove / check)
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computeSkillHash, readLockFile, writeLockFile } from "./lock.js";
import { AGENTS_SKILLS_DIR, CLAUDE_SKILLS_DIR } from "./types.js";

/**
 * Install a skill by writing SKILL.md to both `.claude/skills/<name>/`
 * and `.agents/skills/<name>/`, then updating `skills-lock.json`.
 */
export async function installSkill(
  projectRoot: string,
  name: string,
  content: string,
  source: string
): Promise<void> {
  const claudeDir = join(projectRoot, CLAUDE_SKILLS_DIR, name);
  const agentsDir = join(projectRoot, AGENTS_SKILLS_DIR, name);

  mkdirSync(claudeDir, { recursive: true });
  mkdirSync(agentsDir, { recursive: true });

  writeFileSync(join(claudeDir, "SKILL.md"), content, "utf-8");
  writeFileSync(join(agentsDir, "SKILL.md"), content, "utf-8");

  const lock = readLockFile(projectRoot);
  lock.skills[name] = {
    source,
    sourceType: "github",
    computedHash: computeSkillHash(content),
  };
  writeLockFile(projectRoot, lock);
}

/**
 * Remove a skill by deleting both skill directories and removing the
 * entry from `skills-lock.json`. Prints a warning if not installed.
 */
export async function removeSkill(
  projectRoot: string,
  name: string
): Promise<void> {
  if (!isSkillInstalled(projectRoot, name)) {
    console.warn(`Skill "${name}" is not installed.`);
    return;
  }

  const claudeDir = join(projectRoot, CLAUDE_SKILLS_DIR, name);
  const agentsDir = join(projectRoot, AGENTS_SKILLS_DIR, name);

  if (existsSync(claudeDir)) {
    rmSync(claudeDir, { recursive: true, force: true });
  }
  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  const lock = readLockFile(projectRoot);
  delete lock.skills[name];
  writeLockFile(projectRoot, lock);
}

/**
 * Check whether a skill is currently installed by looking it up
 * in `skills-lock.json`.
 */
export function isSkillInstalled(projectRoot: string, name: string): boolean {
  const lock = readLockFile(projectRoot);
  return name in lock.skills;
}
