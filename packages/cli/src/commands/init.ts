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
 * 7. Generate .sandboxignore
 * 8. Create GitHub labels if they don't exist
 * 9. Update .gitignore
 * 10. Print success message with next steps
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

const LOCUS_MD_TEMPLATE = `## Planning First

**Before writing any code** for complex or multi-step tasks, you **must** create a plan file at \`.locus/plans/<task-name>.md\`. Do NOT skip this step — write the plan file to disk first, then execute.

**Plan file structure:**
- **Goal**: What we're trying to achieve and why
- **Approach**: Step-by-step strategy with technical decisions
- **Affected files**: List of files to create/modify/delete
- **Acceptance criteria**: Specific, testable conditions for completion
- **Dependencies**: Required packages, APIs, or external services

**When to plan:**
- Tasks that touch 3+ files
- New features or architectural changes
- Tasks with ambiguous requirements that need decomposition
- Any task where multiple approaches exist

**When you can skip planning:**
- Single-file bug fixes with obvious root cause
- Typo corrections, comment updates, or trivial changes
- Tasks with very specific, step-by-step instructions already provided

Delete the planning \`.md\` files after successful execution.

## Code Quality

- **Follow existing patterns**: Run formatters and linters before finishing (check "package.json" scripts or project config)
- **Minimize changes**: Keep modifications atomic. Separate refactors from behavioral changes into different tasks
- **Never commit secrets**: No API keys, passwords, or credentials in code. Use environment variables or secret management
- **Test as you go**: If tests exist, run relevant ones. If breaking changes occur, update tests accordingly
- **Comment complex logic**: Explain *why*, not *what*. Focus on business logic and non-obvious decisions

## Parallel Execution with Subagents

Use the **Task tool** to launch subagents for parallelizing independent work. Subagents run autonomously and return results when done.

**When to use subagents:**
- **Codebase exploration**: Use \`subagent_type: "Explore"\` to search for files, patterns, or understand architecture across multiple locations simultaneously
- **Independent research**: Launch multiple explore agents in parallel when you need to understand different parts of the codebase at once
- **Complex multi-area changes**: When a task touches unrelated areas, use explore agents to gather context from each area in parallel before making changes

**How to use:**
- Specify \`subagent_type\` — use \`"Explore"\` for codebase research, \`"general-purpose"\` for multi-step autonomous tasks
- Launch multiple agents in a **single message** to run them concurrently
- Provide clear, detailed prompts so agents can work autonomously
- Do NOT duplicate work — if you delegate research to a subagent, wait for results instead of searching yourself

**When NOT to use subagents:**
- Simple, directed searches (use Glob or Grep directly)
- Reading a specific known file (use Read directly)
- Tasks that require sequential steps where each depends on the previous

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

**The quality bar:** Ask yourself — "Would a new agent working on a completely different task benefit from knowing this?" If yes, record it. If it only matters for the current task or file, skip it.

**When to update:**
- User corrects your approach, rejects a choice, or states a preference explicitly
- You discover where something lives architecturally (e.g., which package owns shared types)
- A structural or design decision would not be obvious from reading the code
- You encounter a non-obvious constraint that applies project-wide

**What to record (high-value):**
- Where things live: package ownership, shared utilities, config locations
- Architectural decisions and their rationale ("we use X not Y because Z")
- Explicit user preference overrides — when the user corrects or rejects an approach
- Project-wide conventions that aren't visible from a single file

**What NOT to record (low-value):**
- One-time fixes or workarounds specific to a single file or function
- Implementation details that are obvious from reading the code
- Startup sequences, signal handlers, or local patterns — unless they represent a project-wide rule
- Anything the next agent could discover in 30 seconds by reading the relevant file

**Good examples:**
- \`[Architecture]\`: Shared types for all packages live in \`@locusai/shared\` — never redefine them locally in CLI or API packages.
- \`[User Preferences]\`: User prefers not to track low-level interrupt/signal handling patterns in learnings — focus on architectural and decision-level entries.
- \`[Packages]\`: Validation uses Zod throughout — do not introduce a second validation library.

**Bad examples (do not write these):**
- \`[Patterns]\`: \`run.ts\` must call \`registerShutdownHandlers()\` at startup. ← too local, obvious from the file.
- \`[Debugging]\`: Fixed a regex bug in \`image-detect.ts\`. ← one-time fix, irrelevant to future tasks.

**Format (append-only, never delete):**

\`\`\`
- **[Category]**: Concise description (1-2 lines max). *Rationale if non-obvious.*
\`\`\`

**Categories:** Architecture, Packages, User Preferences, Conventions, Debugging

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

## Project Overview

<!-- Describe your project: what it does, the tech stack, and architecture -->

## Conventions

<!-- Coding style, naming conventions, file organization patterns -->

## Development Workflow

<!-- How to run, test, build, and deploy the project -->
`;

const SANDBOXIGNORE_TEMPLATE = `# Files and directories to exclude from sandbox environments.
# Patterns follow .gitignore syntax (one per line, # for comments).
# These files will be removed from the sandbox after creation.

# Environment files
.env
.env.*
!.env.example

# Secrets and credentials
*.pem
*.key
*.p12
*.pfx
*.keystore
credentials.json
service-account*.json

# Cloud provider configs
.aws/
.gcp/
.azure/

# Docker secrets
docker-compose.override.yml
`;

const LEARNINGS_MD_TEMPLATE = `# Learnings

This file captures important lessons, decisions, and corrections made during development.
It is read by AI agents before every task to avoid repeating mistakes and to follow established patterns.

<!-- Add learnings below this line. Format: - **[Category]**: Description -->
- **[User Preferences]**: Do not record low-level implementation details or one-time fixes in learnings. Focus on architectural decisions, package ownership, and explicit user preference overrides — entries that help any future agent on any task, not just the current one.
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
  ".locus/tmp/",
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
    // On re-init, preserve existing AI/agent/sprint/sandbox settings
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
      if (existing.sandbox)
        config.sandbox = { ...config.sandbox, ...existing.sandbox };
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

  // 8. Generate .sandboxignore (only if not exists)
  const sandboxIgnorePath = join(cwd, ".sandboxignore");
  if (!existsSync(sandboxIgnorePath)) {
    writeFileSync(sandboxIgnorePath, SANDBOXIGNORE_TEMPLATE, "utf-8");
    process.stderr.write(`${green("✓")} Generated .sandboxignore\n`);
  } else {
    process.stderr.write(
      `${dim("○")} .sandboxignore already exists (preserved)\n`
    );
  }

  // 9. Create GitHub labels
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

  // 10. Update .gitignore
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

  // 11. Print next steps
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

  // 12. Sandbox tutorial
  process.stderr.write(`\n${bold("Sandbox mode")} ${dim("(recommended)")}\n`);
  process.stderr.write(
    `  Run AI agents in an isolated Docker sandbox for safety.\n\n`
  );
  process.stderr.write(
    `  ${gray("1.")} ${cyan("locus sandbox")}          ${dim("Create claude/codex sandboxes")}\n`
  );
  process.stderr.write(
    `  ${gray("2.")} ${cyan("locus sandbox claude")}   ${dim("Login to Claude inside the sandbox")}\n`
  );
  process.stderr.write(
    `  ${gray("3.")} ${cyan("locus sandbox codex")}    ${dim("Login to Codex inside the sandbox")}\n`
  );
  process.stderr.write(
    `  ${gray("4.")} ${cyan("locus exec")}             ${dim("All commands now run sandboxed")}\n`
  );
  process.stderr.write(
    `  ${dim("Learn more:")} ${cyan("locus sandbox help")}\n`
  );
  process.stderr.write("\n");

  log.info("Locus initialized", {
    owner: context.owner,
    repo: context.repo,
    reInit: isReInit,
  });
}
