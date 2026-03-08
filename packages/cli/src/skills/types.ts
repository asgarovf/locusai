// ---------------------------------------------------------------------------
// Skills Marketplace – shared types & constants
// ---------------------------------------------------------------------------

// ---- Remote registry (hosted on GitHub) ------------------------------------

export interface RemoteSkillEntry {
  name: string;
  description: string;
  tags: string[];
  platforms: string[];
  path: string;
  author: string;
}

export interface RemoteSkillRegistry {
  version: number;
  skills: RemoteSkillEntry[];
}

// ---- Local lock file (skills-lock.json) ------------------------------------

export interface SkillLockEntry {
  source: string;
  sourceType: "github";
  computedHash: string;
}

export interface SkillLockFile {
  version: number;
  skills: Record<string, SkillLockEntry>;
}

// ---- Constants -------------------------------------------------------------

export const REGISTRY_REPO = "asgarovf/locusai";
export const REGISTRY_BRANCH = "master";
export const SKILLS_LOCK_FILENAME = "skills-lock.json";
export const CLAUDE_SKILLS_DIR = ".claude/skills";
export const AGENTS_SKILLS_DIR = ".agents/skills";
