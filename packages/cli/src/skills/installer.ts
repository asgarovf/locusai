// ---------------------------------------------------------------------------
// Skills Marketplace – skill installer (install / remove / check)
// ---------------------------------------------------------------------------

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeSkillHash, readLockFile, writeLockFile } from "./lock.js";
import { AGENTS_SKILLS_DIR, CLAUDE_SKILLS_DIR } from "./types.js";

// ─── Error types ────────────────────────────────────────────────────────────

export type InstallStep = "stage" | "validate" | "write" | "register";

export class SkillInstallError extends Error {
  constructor(
    public readonly skillName: string,
    public readonly step: InstallStep,
    cause?: unknown
  ) {
    const stepLabel: Record<InstallStep, string> = {
      stage: "staging files to temp directory",
      validate: "validating skill content",
      write: "writing skill files to project",
      register: "updating skills-lock.json",
    };
    const reason = cause instanceof Error ? cause.message : String(cause ?? "");
    super(
      `Failed to install '${skillName}' during ${stepLabel[step]}${reason ? `: ${reason}` : ""}`
    );
    this.name = "SkillInstallError";
  }
}

// ─── Install (atomic) ───────────────────────────────────────────────────────

/**
 * Install a skill atomically.
 *
 * 1. Stage SKILL.md in an OS temp directory.
 * 2. Validate content (non-empty, hash check).
 * 3. Move staged files to `.claude/skills/<name>/` and `.agents/skills/<name>/`.
 * 4. Update `skills-lock.json`.
 *
 * If any step fails, all staged and partially-written files are cleaned up
 * so the project is left in a consistent state.
 */
export async function installSkill(
  projectRoot: string,
  name: string,
  content: string,
  source: string
): Promise<void> {
  const claudeDir = join(projectRoot, CLAUDE_SKILLS_DIR, name);
  const agentsDir = join(projectRoot, AGENTS_SKILLS_DIR, name);

  // Create a unique temp staging directory
  const stagingDir = join(
    tmpdir(),
    `locus-skill-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const stagingClaudeDir = join(stagingDir, "claude");
  const stagingAgentsDir = join(stagingDir, "agents");

  // Track what we've written to the final locations for rollback
  let wroteClaudeDir = false;
  let wroteAgentsDir = false;

  try {
    // Step 1: Stage files to temp directory
    try {
      mkdirSync(stagingClaudeDir, { recursive: true });
      mkdirSync(stagingAgentsDir, { recursive: true });
      writeFileSync(join(stagingClaudeDir, "SKILL.md"), content, "utf-8");
      writeFileSync(join(stagingAgentsDir, "SKILL.md"), content, "utf-8");
    } catch (err) {
      throw new SkillInstallError(name, "stage", err);
    }

    // Step 2: Validate content
    try {
      if (!content || content.trim().length === 0) {
        throw new Error("Skill content is empty");
      }
      // Verify written files match expected hash
      const expectedHash = computeSkillHash(content);
      const stagedContent = readFileSync(
        join(stagingClaudeDir, "SKILL.md"),
        "utf-8"
      );
      const stagedHash = computeSkillHash(stagedContent);
      if (stagedHash !== expectedHash) {
        throw new Error("Staged file hash does not match expected content");
      }
    } catch (err) {
      if (err instanceof SkillInstallError) throw err;
      throw new SkillInstallError(name, "validate", err);
    }

    // Step 3: Move staged files to final locations
    try {
      // Ensure parent directories exist
      mkdirSync(join(projectRoot, CLAUDE_SKILLS_DIR), { recursive: true });
      mkdirSync(join(projectRoot, AGENTS_SKILLS_DIR), { recursive: true });

      // Remove any existing (possibly broken) skill directories first
      if (existsSync(claudeDir)) {
        rmSync(claudeDir, { recursive: true, force: true });
      }
      if (existsSync(agentsDir)) {
        rmSync(agentsDir, { recursive: true, force: true });
      }

      // Move from staging to final location
      // renameSync may fail across filesystems, so fall back to copy+delete
      try {
        renameSync(stagingClaudeDir, claudeDir);
        wroteClaudeDir = true;
      } catch {
        // Cross-filesystem fallback: copy then delete
        mkdirSync(claudeDir, { recursive: true });
        writeFileSync(join(claudeDir, "SKILL.md"), content, "utf-8");
        wroteClaudeDir = true;
      }

      try {
        renameSync(stagingAgentsDir, agentsDir);
        wroteAgentsDir = true;
      } catch {
        mkdirSync(agentsDir, { recursive: true });
        writeFileSync(join(agentsDir, "SKILL.md"), content, "utf-8");
        wroteAgentsDir = true;
      }
    } catch (err) {
      if (err instanceof SkillInstallError) throw err;
      throw new SkillInstallError(name, "write", err);
    }

    // Step 4: Update lock file
    try {
      const lock = readLockFile(projectRoot);
      lock.skills[name] = {
        source,
        sourceType: "github",
        computedHash: computeSkillHash(content),
      };
      writeLockFile(projectRoot, lock);
    } catch (err) {
      throw new SkillInstallError(name, "register", err);
    }
  } catch (err) {
    // Rollback: remove any partially-written final directories
    if (wroteClaudeDir && existsSync(claudeDir)) {
      rmSync(claudeDir, { recursive: true, force: true });
    }
    if (wroteAgentsDir && existsSync(agentsDir)) {
      rmSync(agentsDir, { recursive: true, force: true });
    }
    throw err;
  } finally {
    // Always clean up the staging directory
    if (existsSync(stagingDir)) {
      rmSync(stagingDir, { recursive: true, force: true });
    }
  }
}

// ─── Remove ─────────────────────────────────────────────────────────────────

/**
 * Remove a skill by deleting both skill directories and removing the
 * entry from `skills-lock.json`.
 *
 * Works even for broken/orphaned installs — cleans up directories on disk
 * regardless of whether the skill is registered in the lock file.
 */
export async function removeSkill(
  projectRoot: string,
  name: string
): Promise<void> {
  const claudeDir = join(projectRoot, CLAUDE_SKILLS_DIR, name);
  const agentsDir = join(projectRoot, AGENTS_SKILLS_DIR, name);
  const lock = readLockFile(projectRoot);

  const inLockFile = name in lock.skills;
  const hasClaude = existsSync(claudeDir);
  const hasAgents = existsSync(agentsDir);

  if (!inLockFile && !hasClaude && !hasAgents) {
    console.warn(`Skill "${name}" is not installed.`);
    return;
  }

  // Remove directories regardless of lock file state
  if (hasClaude) {
    rmSync(claudeDir, { recursive: true, force: true });
  }
  if (hasAgents) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  // Remove lock file entry if present
  if (inLockFile) {
    delete lock.skills[name];
    writeLockFile(projectRoot, lock);
  }
}

// ─── Check ──────────────────────────────────────────────────────────────────

/**
 * Check whether a skill is currently installed by looking it up
 * in `skills-lock.json`.
 */
export function isSkillInstalled(projectRoot: string, name: string): boolean {
  const lock = readLockFile(projectRoot);
  return name in lock.skills;
}

/**
 * Check whether a skill has orphaned files on disk (directories exist
 * but no lock file entry). Useful for detecting broken installs.
 */
export function hasOrphanedSkillFiles(
  projectRoot: string,
  name: string
): boolean {
  const claudeDir = join(projectRoot, CLAUDE_SKILLS_DIR, name);
  const agentsDir = join(projectRoot, AGENTS_SKILLS_DIR, name);
  const inLockFile = isSkillInstalled(projectRoot, name);

  return !inLockFile && (existsSync(claudeDir) || existsSync(agentsDir));
}
