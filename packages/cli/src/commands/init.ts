/**
 * `locus init` — Initialize Locus in a GitHub repository.
 *
 * Flow:
 * 1. Check gh CLI is installed and authenticated
 * 2. Detect GitHub repo from git remote
 * 3. Create .locus/ directory structure
 * 4. Generate config.json with detected values
 * 5. Generate LOCUS.md template
 * 6. Generate LEARNINGS.md
 * 7. Create GitHub labels if they don't exist
 * 8. Update .gitignore
 * 9. Print success message with next steps
 *
 * Idempotent: re-running updates config without overwriting user content.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG, isInitialized, saveConfig } from "../core/config.js";
import { checkGhCli, detectRepoContext, isGitRepo } from "../core/context.js";
import { ensureLabels } from "../core/github.js";
import { getLogger } from "../core/logger.js";
import {
  bold,
  cyan,
  dim,
  gray,
  green,
  red,
  yellow,
} from "../display/terminal.js";
import { ALL_LABELS, type LocusConfig } from "../types.js";

// ─── Templates ───────────────────────────────────────────────────────────────

const LOCUS_MD_TEMPLATE = `# Locus — Project Instructions

This file provides context to AI agents when executing tasks.

## Project Overview

<!-- Describe your project: what it does, the tech stack, and architecture -->

## Conventions

<!-- Coding style, naming conventions, file organization patterns -->

## Development Workflow

<!-- How to run, test, build, and deploy the project -->

## Important Notes

<!-- Anything the AI agent should know: gotchas, design decisions, constraints -->
`;

const LEARNINGS_MD_TEMPLATE = `# Learnings

This file captures important lessons, decisions, and corrections made during development.
It is read by AI agents before every task to avoid repeating mistakes and to follow established patterns.

<!-- Add learnings below this line. Format: - **[Category]**: Description -->
`;

const GITIGNORE_ENTRIES = [
  "",
  "# Locus",
  ".locus/config.json",
  ".locus/run-state.json",
  ".locus/rate-limit.json",
  ".locus/sessions/",
  ".locus/logs/",
  ".locus/worktrees/",
  ".locus/artifacts/",
  ".locus/discussions/",
];

// ─── Command ─────────────────────────────────────────────────────────────────

export async function initCommand(cwd: string): Promise<void> {
  const log = getLogger();

  process.stderr.write(`\n${bold("Initializing Locus...")}\n\n`);

  // 1. Check git repo
  if (!isGitRepo(cwd)) {
    process.stderr.write(`${red("✗")} Not a git repository.\n`);
    process.stderr.write(`  Initialize with: ${bold("git init")}\n`);
    process.exit(1);
  }
  process.stderr.write(`${green("✓")} Git repository detected\n`);

  // 2. Check gh CLI
  const ghStatus = checkGhCli();
  if (!ghStatus.installed) {
    process.stderr.write(`${red("✗")} GitHub CLI (gh) is not installed.\n`);
    process.stderr.write(`  Install from: ${bold("https://cli.github.com")}\n`);
    process.exit(1);
  }
  if (!ghStatus.authenticated) {
    process.stderr.write(`${red("✗")} GitHub CLI is not authenticated.\n`);
    process.stderr.write(`  Authenticate with: ${bold("gh auth login")}\n`);
    process.exit(1);
  }
  process.stderr.write(`${green("✓")} GitHub CLI authenticated\n`);

  // 3. Detect repo context
  let context: ReturnType<typeof detectRepoContext>;
  try {
    context = detectRepoContext(cwd);
  } catch (e) {
    process.stderr.write(`${red("✗")} ${(e as Error).message}\n`);
    process.exit(1);
    return; // Type narrowing
  }
  process.stderr.write(
    `${green("✓")} Repository: ${bold(`${context.owner}/${context.repo}`)} (branch: ${context.defaultBranch})\n`
  );

  // 4. Create .locus/ directory structure
  const locusDir = join(cwd, ".locus");
  const dirs = [
    locusDir,
    join(locusDir, "sessions"),
    join(locusDir, "discussions"),
    join(locusDir, "artifacts"),
    join(locusDir, "plans"),
    join(locusDir, "logs"),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  process.stderr.write(`${green("✓")} Created .locus/ directory structure\n`);

  // 5. Generate config.json
  const isReInit = isInitialized(cwd);
  const config: LocusConfig = {
    ...DEFAULT_CONFIG,
    github: {
      owner: context.owner,
      repo: context.repo,
      defaultBranch: context.defaultBranch,
    },
    agent: {
      ...DEFAULT_CONFIG.agent,
      baseBranch: context.defaultBranch,
    },
  };

  if (isReInit) {
    // On re-init, preserve existing AI/agent/sprint settings
    try {
      const existing = JSON.parse(
        readFileSync(join(locusDir, "config.json"), "utf-8")
      );
      if (existing.ai) config.ai = { ...config.ai, ...existing.ai };
      if (existing.agent) config.agent = { ...config.agent, ...existing.agent };
      if (existing.sprint)
        config.sprint = { ...config.sprint, ...existing.sprint };
      if (existing.logging)
        config.logging = { ...config.logging, ...existing.logging };
    } catch {
      // Ignore parse errors on re-init
    }
    process.stderr.write(
      `${green("✓")} Updated config.json (preserved existing settings)\n`
    );
  } else {
    process.stderr.write(`${green("✓")} Generated config.json\n`);
  }
  saveConfig(cwd, config);

  // 6. Generate LOCUS.md (only if not exists)
  const locusMdPath = join(locusDir, "LOCUS.md");
  if (!existsSync(locusMdPath)) {
    writeFileSync(locusMdPath, LOCUS_MD_TEMPLATE, "utf-8");
    process.stderr.write(
      `${green("✓")} Generated LOCUS.md (edit to add project context)\n`
    );
  } else {
    process.stderr.write(`${dim("○")} LOCUS.md already exists (preserved)\n`);
  }

  // 7. Generate LEARNINGS.md (only if not exists)
  const learningsMdPath = join(locusDir, "LEARNINGS.md");
  if (!existsSync(learningsMdPath)) {
    writeFileSync(learningsMdPath, LEARNINGS_MD_TEMPLATE, "utf-8");
    process.stderr.write(`${green("✓")} Generated LEARNINGS.md\n`);
  } else {
    process.stderr.write(
      `${dim("○")} LEARNINGS.md already exists (preserved)\n`
    );
  }

  // 8. Create GitHub labels
  process.stderr.write(`${cyan("●")} Creating GitHub labels...`);
  try {
    ensureLabels(ALL_LABELS, { cwd });
    process.stderr.write(
      `\r${green("✓")} GitHub labels created/verified      \n`
    );
  } catch (e) {
    process.stderr.write(
      `\r${yellow("⚠")} Some labels could not be created: ${(e as Error).message}\n`
    );
  }

  // 9. Update .gitignore
  const gitignorePath = join(cwd, ".gitignore");
  let gitignoreContent = "";
  if (existsSync(gitignorePath)) {
    gitignoreContent = readFileSync(gitignorePath, "utf-8");
  }

  const entriesToAdd = GITIGNORE_ENTRIES.filter(
    (entry) => entry && !gitignoreContent.includes(entry.trim())
  );

  if (entriesToAdd.length > 0) {
    const newContent = `${gitignoreContent.trimEnd()}\n\n${entriesToAdd.join("\n")}\n`;
    writeFileSync(gitignorePath, newContent, "utf-8");
    process.stderr.write(`${green("✓")} Updated .gitignore\n`);
  } else {
    process.stderr.write(`${dim("○")} .gitignore already configured\n`);
  }

  // 10. Print next steps
  process.stderr.write(`\n${bold(green("Locus initialized!"))}\n\n`);
  process.stderr.write(`${bold("Next steps:")}\n`);
  process.stderr.write(
    `  ${gray("1.")} Edit ${bold(".locus/LOCUS.md")} to add project context\n`
  );
  process.stderr.write(
    `  ${gray("2.")} Create issues: ${bold('locus issue create "My task"')}\n`
  );
  process.stderr.write(
    `  ${gray("3.")} Plan a sprint: ${bold('locus plan "Build feature X"')}\n`
  );
  process.stderr.write(
    `  ${gray("4.")} Start coding:  ${bold("locus exec")}\n`
  );
  process.stderr.write("\n");

  log.info("Locus initialized", {
    owner: context.owner,
    repo: context.repo,
    reInit: isReInit,
  });
}
