import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getLocusPath,
  LOCUS_CONFIG,
  LOCUS_GITIGNORE_PATTERNS,
  LOCUS_SCHEMAS,
} from "@locusai/sdk/node";

const LOCUS_GITIGNORE_MARKER = "# Locus AI";

const LOCUS_MD_TEMPLATE = `## Planning First

Complex tasks must be planned before writing code. Create ".locus/plans/<task-name>.md" with:
- **Goal**: What we're trying to achieve and why
- **Approach**: Step-by-step strategy with technical decisions
- **Affected files**: List of files to create/modify/delete
- **Acceptance criteria**: Specific, testable conditions for completion
- **Dependencies**: Required packages, APIs, or external services

Delete the planning .md files after successful execution.

## Code Quality

- **Follow existing patterns**: Run formatters and linters before finishing (check "package.json" scripts or project config)
- **Minimize changes**: Keep modifications atomic. Separate refactors from behavioral changes into different tasks
- **Never commit secrets**: No API keys, passwords, or credentials in code. Use environment variables or secret management
- **Test as you go**: If tests exist, run relevant ones. If breaking changes occur, update tests accordingly
- **Comment complex logic**: Explain *why*, not *what*. Focus on business logic and non-obvious decisions

## Artifacts

When a task produces knowledge, analysis, or research output rather than (or in addition to) code changes, you **must** save results as Markdown in ".locus/artifacts/<descriptive-name>.md":

**Always create artifacts for:**
- Code quality audits, security reviews, vulnerability assessments
- Architecture analyses, system design proposals, or recommendations
- Dependency reports, performance profiling, benchmarking results
- Research summaries, technology comparisons, or feasibility studies
- Migration plans, deployment strategies, or rollback procedures
- Post-mortems, incident analysis, or debugging investigations

**Artifact structure:**
- Clear title and date
- Executive summary (2-3 sentences)
- Detailed findings/analysis
- Actionable recommendations (if applicable)

## Git Operations

- **Do NOT run**: git add, git commit, git push, git checkout, git branch, or any git commands
- **Why**: The Locus orchestrator handles all version control automatically after execution
- **Your role**: Focus solely on making file changes. The system commits, pushes, and creates PRs

## Continuous Learning

Read ".locus/LEARNINGS.md" **before starting any task** to avoid repeating mistakes.

**When to update:**
- User corrects your approach or provides guidance
- You discover a better pattern while working
- A decision prevents future confusion (e.g., "use X not Y because Z")
- You encounter and solve a tricky problem

**What to record:**
- Architectural decisions and their rationale
- Preferred libraries, tools, or patterns for this project
- Common pitfalls and how to avoid them
- Project-specific conventions or user preferences
- Solutions to non-obvious problems

**Format (append-only, never delete):**

"""
- **[Category]**: Concise description (1-2 lines max). *Context if needed.*
"""

**Categories:** Architecture, Dependencies, Patterns, Debugging, Performance, Security, DevOps, User Preferences

## Error Handling

- **Read error messages carefully**: Don't guess. Parse the actual error before proposing fixes
- **Check dependencies first**: Missing packages, wrong versions, and environment issues are common
- **Verify assumptions**: If something "should work," confirm it actually does in this environment
- **Ask for context**: If you need environment details, configuration, or logs, request them explicitly

## Communication

- **Be precise**: When uncertain, state what you know and what you're assuming
- **Show your work**: For complex changes, briefly explain the approach before executing
- **Highlight trade-offs**: If multiple approaches exist, note why you chose one over others
- **Request feedback**: For ambiguous requirements, propose an approach and ask for confirmation
`;

const DEFAULT_LEARNINGS_MD = `# Learnings

This file captures important lessons, decisions, and corrections made during development.
It is read by AI agents before every task to avoid repeating mistakes and to follow established patterns.

<!-- Add learnings below this line. Format: - **[Category]**: Description -->
`;

/**
 * Updates or creates .gitignore with locus-specific patterns.
 * If locus patterns already exist, replaces them with the current set.
 * This ensures new patterns (e.g. reviews/, plans/) are added on reinit.
 */
function updateGitignore(projectPath: string): void {
  const gitignorePath = join(projectPath, ".gitignore");
  let content = "";
  const locusBlock = LOCUS_GITIGNORE_PATTERNS.join("\n");

  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, "utf-8");

    if (content.includes(LOCUS_GITIGNORE_MARKER)) {
      // Find the existing locus block and replace it.
      // The block starts at the first "# Locus AI" line and continues
      // through all consecutive comment/pattern lines until a blank line
      // followed by non-locus content or end of file.
      const lines = content.split("\n");
      const startIdx = lines.findIndex((l) =>
        l.includes(LOCUS_GITIGNORE_MARKER)
      );
      let endIdx = startIdx;

      // Walk forward past all lines that are part of the locus block:
      // comment lines starting with "# Locus AI", pattern lines, and empty separator lines
      for (let i = startIdx; i < lines.length; i++) {
        if (
          lines[i].startsWith(LOCUS_GITIGNORE_MARKER) ||
          lines[i].startsWith(".locus") ||
          lines[i].trim() === ""
        ) {
          endIdx = i;
        } else {
          break;
        }
      }

      // Replace the old block with the current patterns
      const before = lines.slice(0, startIdx);
      const after = lines.slice(endIdx + 1);

      content = [...before, locusBlock, ...after].join("\n");
      writeFileSync(gitignorePath, content);
      return;
    }

    // No existing locus block — append
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }

    if (content.trim().length > 0) {
      content += "\n";
    }
  }

  content += `${locusBlock}\n`;
  writeFileSync(gitignorePath, content);
}

/**
 * Ensures a git identity (user.name / user.email) is configured locally for
 * the project so commits don't fall back to the hostname-based default
 * (e.g. Ubuntu <ubuntu@ip-...>).  Only sets values when the current local
 * config is empty — it will never overwrite an existing identity.
 */
function ensureGitIdentity(projectPath: string): void {
  const hasName = (() => {
    try {
      return execSync("git config --get user.name", {
        cwd: projectPath,
        stdio: ["pipe", "pipe", "pipe"],
      })
        .toString()
        .trim();
    } catch {
      return "";
    }
  })();

  const hasEmail = (() => {
    try {
      return execSync("git config --get user.email", {
        cwd: projectPath,
        stdio: ["pipe", "pipe", "pipe"],
      })
        .toString()
        .trim();
    } catch {
      return "";
    }
  })();

  if (!hasName) {
    execSync('git config user.name "LocusAgent"', {
      cwd: projectPath,
      stdio: "ignore",
    });
  }

  if (!hasEmail) {
    execSync('git config user.email "agent@locusai.team"', {
      cwd: projectPath,
      stdio: "ignore",
    });
  }

  execSync("git config --global pull.rebase true", {
    cwd: projectPath,
    stdio: "ignore",
  });
}

export interface LocusProjectConfig {
  $schema?: string;
  version: string;
  createdAt: string;
  projectPath: string;
}

export class ConfigManager {
  constructor(private projectPath: string) {}

  async init(version: string): Promise<void> {
    const locusConfigDir = join(this.projectPath, LOCUS_CONFIG.dir);
    const locusConfigPath = getLocusPath(this.projectPath, "configFile");
    // 1. Create .locus directory, subdirectories, and config
    if (!existsSync(locusConfigDir)) {
      mkdirSync(locusConfigDir, { recursive: true });
    }

    // Ensure required subdirectories exist
    const locusSubdirs = [
      LOCUS_CONFIG.artifactsDir,
      LOCUS_CONFIG.documentsDir,
      LOCUS_CONFIG.sessionsDir,
      LOCUS_CONFIG.reviewsDir,
      LOCUS_CONFIG.plansDir,
    ];

    for (const subdir of locusSubdirs) {
      const subdirPath = join(locusConfigDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
      }
    }

    // Create LOCUS.md agent instructions file
    const locusMdPath = getLocusPath(this.projectPath, "contextFile");
    if (!existsSync(locusMdPath)) {
      writeFileSync(locusMdPath, LOCUS_MD_TEMPLATE);
    }

    // Create LEARNINGS.md for continuous learning
    const learningsMdPath = getLocusPath(this.projectPath, "learningsFile");
    if (!existsSync(learningsMdPath)) {
      writeFileSync(learningsMdPath, DEFAULT_LEARNINGS_MD);
    }

    if (!existsSync(locusConfigPath)) {
      const config: LocusProjectConfig = {
        $schema: LOCUS_SCHEMAS.config,
        version,
        createdAt: new Date().toISOString(),
        projectPath: ".",
      };
      writeFileSync(locusConfigPath, JSON.stringify(config, null, 2));
    }

    // 3. Update .gitignore with locus-specific patterns
    updateGitignore(this.projectPath);

    // 4. Ensure git identity is configured for commits
    ensureGitIdentity(this.projectPath);
  }

  loadConfig(): LocusProjectConfig | null {
    const path = getLocusPath(this.projectPath, "configFile");
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf-8"));
    }
    return null;
  }

  updateVersion(version: string): void {
    const config = this.loadConfig();
    if (config && config.version !== version) {
      config.version = version;
      this.saveConfig(config);
    }
  }

  /**
   * Reinitialize an existing project to ensure all configuration is up to date.
   * This is a non-destructive operation that:
   * - Updates the version in config.json
   * - Ensures all required directories exist
   * - Updates .gitignore with any missing patterns
   *
   * @returns Object indicating what was updated
   */
  async reinit(version: string): Promise<{
    versionUpdated: boolean;
    previousVersion: string | null;
    directoriesCreated: string[];
    gitignoreUpdated: boolean;
  }> {
    const result = {
      versionUpdated: false,
      previousVersion: null as string | null,
      directoriesCreated: [] as string[],
      gitignoreUpdated: false,
    };

    // 1. Update version and ensure $schema in config
    const config = this.loadConfig();
    if (config) {
      result.previousVersion = config.version;
      const needsSchemaUpdate = config.$schema !== LOCUS_SCHEMAS.config;
      if (config.version !== version) {
        config.version = version;
        result.versionUpdated = true;
      }
      if (result.versionUpdated || needsSchemaUpdate) {
        this.saveConfig(config);
      }
    }

    // 1b. Ensure $schema in settings.json if it exists
    const settingsPath = join(
      this.projectPath,
      LOCUS_CONFIG.dir,
      LOCUS_CONFIG.settingsFile
    );
    if (existsSync(settingsPath)) {
      const raw = readFileSync(settingsPath, "utf-8");
      const settings = JSON.parse(raw);
      if (settings.$schema !== LOCUS_SCHEMAS.settings) {
        const { $schema: _, ...rest } = settings;
        const ordered = { $schema: LOCUS_SCHEMAS.settings, ...rest };
        writeFileSync(settingsPath, JSON.stringify(ordered, null, 2), "utf-8");
      }
    }

    // 2. Update LOCUS.md with the latest template on every reinit
    const locusMdPath = getLocusPath(this.projectPath, "contextFile");
    const locusMdExisted = existsSync(locusMdPath);

    writeFileSync(locusMdPath, LOCUS_MD_TEMPLATE);
    if (!locusMdExisted) {
      result.directoriesCreated.push(".locus/LOCUS.md");
    }

    // 3. Ensure .locus directory and subdirectories exist
    const locusSubdirs = [
      LOCUS_CONFIG.artifactsDir,
      LOCUS_CONFIG.documentsDir,
      LOCUS_CONFIG.sessionsDir,
      LOCUS_CONFIG.reviewsDir,
      LOCUS_CONFIG.plansDir,
    ];

    const locusConfigDir = join(this.projectPath, LOCUS_CONFIG.dir);
    for (const subdir of locusSubdirs) {
      const subdirPath = join(locusConfigDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
        result.directoriesCreated.push(`.locus/${subdir}`);
      }
    }

    // 3. Ensure LEARNINGS.md exists (non-destructive — never overwrite)
    const learningsMdPath = getLocusPath(this.projectPath, "learningsFile");
    if (!existsSync(learningsMdPath)) {
      writeFileSync(learningsMdPath, DEFAULT_LEARNINGS_MD);
      result.directoriesCreated.push(".locus/LEARNINGS.md");
    }

    // 4. Update .gitignore with any missing or outdated patterns
    const gitignorePath = join(this.projectPath, ".gitignore");
    const gitignoreBefore = existsSync(gitignorePath)
      ? readFileSync(gitignorePath, "utf-8")
      : "";

    updateGitignore(this.projectPath);

    const gitignoreAfter = readFileSync(gitignorePath, "utf-8");
    if (gitignoreBefore !== gitignoreAfter) {
      result.gitignoreUpdated = true;
    }

    // 5. Ensure git identity is configured for commits
    ensureGitIdentity(this.projectPath);

    return result;
  }

  private saveConfig(config: LocusProjectConfig): void {
    const { $schema: _, ...rest } = config;
    const ordered = { $schema: LOCUS_SCHEMAS.config, ...rest };
    const path = getLocusPath(this.projectPath, "configFile");
    writeFileSync(path, JSON.stringify(ordered, null, 2));
  }
}
