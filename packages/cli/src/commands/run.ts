/**
 * `locus run` — Sprint and parallel issue execution.
 *
 * Usage:
 *   locus run                      # Run active sprint (sequential)
 *   locus run 42                   # Run single issue (worktree)
 *   locus run 42 43 44             # Run multiple issues (parallel, worktrees)
 *   locus run --resume             # Resume failed sprint run
 *   locus run --dry-run            # Show what would happen
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeIssue } from "../core/agent.js";
import { inferProviderFromModel } from "../core/ai-models.js";
import { loadConfig } from "../core/config.js";
import {
  attemptRebase,
  checkForConflicts,
  printConflictReport,
} from "../core/conflict.js";
import {
  createPR,
  getIssue,
  listIssues,
  listMilestones,
} from "../core/github.js";
import { getLogger } from "../core/logger.js";
import { getRateLimiter } from "../core/rate-limiter.js";
import {
  clearRunState,
  createParallelRunState,
  createSprintRunState,
  getNextTask,
  getRunStats,
  loadRunState,
  markTaskDone,
  markTaskFailed,
  markTaskInProgress,
  saveRunState,
} from "../core/run-state.js";
import {
  detectSandboxSupport,
  getModelSandboxName,
  resolveSandboxMode,
} from "../core/sandbox.js";
import { registerShutdownHandlers } from "../core/shutdown.js";
import {
  cleanupStaleWorktrees,
  createWorktree,
  removeWorktree,
} from "../core/worktree.js";
import {
  createTimer,
  progressBar,
  renderTaskStatus,
} from "../display/progress.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import type { Issue, LocusConfig } from "../types.js";

function resolveExecutionContext(
  config: LocusConfig,
  modelOverride?: string
): { provider: "claude" | "codex"; model: string; sandboxName?: string } {
  const model = modelOverride ?? config.ai.model;
  const provider = inferProviderFromModel(model) ?? config.ai.provider;
  const sandboxName = getModelSandboxName(config.sandbox, model, provider);
  return { provider, model, sandboxName };
}

// ─── Help ────────────────────────────────────────────────────────────────────

function printRunHelp(): void {
  process.stderr.write(`
${bold("locus run")} — Execute issues using AI agents

${bold("Usage:")}
  locus run                           ${dim("# Run active sprint (sequential)")}
  locus run <issue>                   ${dim("# Run single issue (worktree)")}
  locus run <issue> <issue> ...       ${dim("# Run multiple issues (parallel)")}
  locus run --resume                  ${dim("# Resume interrupted run")}

${bold("Options:")}
  --resume              Resume a previously interrupted run
  --dry-run             Show what would happen without executing
  --model <name>        Override the AI model for this run
  --no-sandbox          Disable Docker sandbox isolation
  --sandbox=require     Require Docker sandbox (fail if unavailable)

${bold("Sandbox:")}
  By default, agents run inside Docker Desktop sandboxes (4.58+) for
  hypervisor-level isolation. If Docker is not available, agents run
  unsandboxed with a warning.

${bold("Examples:")}
  locus run                           ${dim("# Execute active sprint")}
  locus run 42                        ${dim("# Run single issue")}
  locus run 42 43 44                  ${dim("# Run issues in parallel")}
  locus run --resume                  ${dim("# Resume after failure")}
  locus run 42 --no-sandbox           ${dim("# Run without sandbox")}
  locus run 42 --sandbox=require      ${dim("# Require sandbox")}

`);
}

// ─── Command ─────────────────────────────────────────────────────────────────

export async function runCommand(
  projectRoot: string,
  args: string[],
  flags: {
    resume?: boolean;
    dryRun?: boolean;
    model?: string;
    sandbox?: string;
    noSandbox?: boolean;
  } = {}
): Promise<void> {
  if (args[0] === "help") {
    printRunHelp();
    return;
  }

  const config = loadConfig(projectRoot);
  const _log = getLogger();
  const cleanupShutdown = registerShutdownHandlers({
    projectRoot,
    getRunState: () => loadRunState(projectRoot),
  });

  try {
    // Resolve sandbox mode (CLI flags override config)
    const sandboxMode = resolveSandboxMode(config.sandbox, flags);
    let sandboxed = false;

    if (sandboxMode !== "disabled") {
      const status = await detectSandboxSupport();
      if (!status.available) {
        if (sandboxMode === "required") {
          process.stderr.write(
            `${red("✗")} Docker sandbox required but not available: ${status.reason}\n`
          );
          process.stderr.write(
            `  Install Docker Desktop 4.58+ or remove --sandbox=require to continue.\n`
          );
          process.exit(1);
        }
        // Auto mode: warn and continue unsandboxed
        process.stderr.write(
          `${yellow("⚠")} Docker sandbox not available: ${status.reason}. Running unsandboxed.\n`
        );
      } else {
        // Docker sandbox available — use it
        sandboxed = true;
      }
    } else if (flags.noSandbox) {
      process.stderr.write(
        `${yellow("⚠")} Running without sandbox. The AI agent will have unrestricted access to your filesystem, network, and environment variables.\n`
      );
    }

    // Note: stale sandbox cleanup is handled centrally in cli.ts prepareSandbox()

    // Resume mode
    if (flags.resume) {
      return handleResume(projectRoot, config, sandboxed);
    }

    // Parse issue numbers from args
    const issueNumbers = args.filter((a) => /^\d+$/.test(a)).map(Number);

    if (issueNumbers.length === 0) {
      // No issue numbers — run active sprint
      return handleSprintRun(projectRoot, config, flags, sandboxed);
    }

    if (issueNumbers.length === 1) {
      // Single issue — standalone execution
      return handleSingleIssue(
        projectRoot,
        config,
        issueNumbers[0],
        flags,
        sandboxed
      );
    }

    // Multiple issues — parallel execution
    return handleParallelRun(
      projectRoot,
      config,
      issueNumbers,
      flags,
      sandboxed
    );
  } finally {
    cleanupShutdown();
  }
}

// ─── Sprint Execution ───────────────────────────────────────────────────────

async function handleSprintRun(
  projectRoot: string,
  config: LocusConfig,
  flags: { dryRun?: boolean; model?: string },
  sandboxed: boolean
): Promise<void> {
  const log = getLogger();
  const execution = resolveExecutionContext(config, flags.model);

  // Check for active sprint
  if (!config.sprint.active) {
    process.stderr.write(
      `${red("✗")} No active sprint. Set one with: ${bold("locus sprint active <name>")}\n`
    );
    process.stderr.write(
      `  Or specify issue numbers: ${bold("locus run 42 43 44")}\n`
    );
    return;
  }

  const sprintName = config.sprint.active;
  process.stderr.write(`\n${bold("Sprint:")} ${cyan(sprintName)}\n`);

  // Check for existing run lock
  const existingState = loadRunState(projectRoot);
  if (existingState && existingState.type === "sprint") {
    const stats = getRunStats(existingState);
    if (stats.inProgress > 0 || stats.pending > 0) {
      process.stderr.write(
        `\n${yellow("⚠")} A sprint run is already in progress.\n`
      );
      process.stderr.write(
        `  Use ${bold("locus run --resume")} to continue.\n`
      );
      return;
    }
  }

  // Fetch sprint issues sorted by order
  const milestones = listMilestones(
    config.github.owner,
    config.github.repo,
    "open",
    { cwd: projectRoot }
  );
  const milestone = milestones.find(
    (m) => m.title.toLowerCase() === sprintName.toLowerCase()
  );

  if (!milestone) {
    process.stderr.write(`${red("✗")} Sprint "${sprintName}" not found.\n`);
    return;
  }

  let issues = listIssues(
    { milestone: sprintName, state: "open" },
    { cwd: projectRoot }
  );

  if (issues.length === 0) {
    process.stderr.write(`${dim("No open issues in sprint.")}\n`);
    return;
  }

  // Sort by order:N label
  issues = sortByOrder(issues);

  // Create run state
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const branchName = `locus/sprint-${sprintName.toLowerCase().replace(/\s+/g, "-")}-${randomSuffix}`;
  const state = createSprintRunState(
    sprintName,
    branchName,
    issues.map((issue, i) => ({
      number: issue.number,
      order: getOrder(issue) ?? i + 1,
    }))
  );
  saveRunState(projectRoot, state);

  process.stderr.write(
    `  ${dim(`${issues.length} tasks, branch: ${branchName}`)}\n\n`
  );

  // Print task list
  for (const task of state.tasks) {
    const issue = issues.find((i) => i.number === task.issue);
    process.stderr.write(
      `${renderTaskStatus(
        task.issue,
        issue?.title ?? "Unknown",
        task.status,
        `order:${task.order}`
      )}\n`
    );
  }
  process.stderr.write("\n");

  if (flags.dryRun) {
    process.stderr.write(
      `${yellow("⚠")} ${bold("Dry run")} — no changes will be made.\n\n`
    );
  }

  // Create/checkout sprint branch
  if (!flags.dryRun) {
    try {
      execSync(`git checkout -B ${branchName}`, {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      log.info(`Checked out branch ${branchName}`);
    } catch (e) {
      process.stderr.write(`${red("✗")} Failed to create branch: ${e}\n`);
      return;
    }
  }

  // Execute tasks sequentially
  const timer = createTimer();

  for (let i = 0; i < state.tasks.length; i++) {
    const task = state.tasks[i];
    const issue = issues.find((iss) => iss.number === task.issue);

    // Skip completed tasks
    if (task.status === "done") {
      process.stderr.write(
        `${renderTaskStatus(task.issue, issue?.title ?? "", "done", "skipped")}\n`
      );
      continue;
    }

    // Check rate limits
    await getRateLimiter().checkBeforeRequest();

    // Check for conflicts (if enabled)
    if (config.agent.rebaseBeforeTask && !flags.dryRun && i > 0) {
      const conflictResult = checkForConflicts(
        projectRoot,
        config.agent.baseBranch
      );

      if (conflictResult.baseAdvanced) {
        printConflictReport(conflictResult, config.agent.baseBranch);

        if (conflictResult.hasConflict) {
          // Stop sprint — user must resolve conflicts
          markTaskFailed(state, task.issue, "Merge conflict with base branch");
          saveRunState(projectRoot, state);
          process.stderr.write(
            `\n${red("✗")} Sprint stopped due to conflicts.\n`
          );
          process.stderr.write(
            `  Resolve conflicts and run: ${bold("locus run --resume")}\n`
          );
          return;
        }

        // Auto-rebase
        const rebaseResult = attemptRebase(
          projectRoot,
          config.agent.baseBranch
        );
        if (!rebaseResult.success) {
          markTaskFailed(state, task.issue, "Rebase failed");
          saveRunState(projectRoot, state);
          process.stderr.write(
            `\n${red("✗")} Auto-rebase failed. Resolve manually.\n`
          );
          return;
        }
      }
    }

    // Build sprint context (diff from base showing previous tasks' work)
    let sprintContext: string | undefined;
    if (i > 0 && !flags.dryRun) {
      try {
        sprintContext = execSync(
          `git diff origin/${config.agent.baseBranch}..HEAD`,
          {
            cwd: projectRoot,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          }
        ).trim();
      } catch {
        // Non-fatal
      }
    }

    // Progress
    process.stderr.write(
      `\n${progressBar(i, state.tasks.length, { label: "Sprint Progress" })}\n\n`
    );

    // Mark in-progress
    markTaskInProgress(state, task.issue);
    saveRunState(projectRoot, state);

    // Execute (skip per-task PR — a single sprint PR is created after all tasks).
    const result = await executeIssue(projectRoot, {
      issueNumber: task.issue,
      provider: execution.provider,
      model: execution.model,
      dryRun: flags.dryRun,
      sprintContext,
      skipPR: true,
      sandboxed,
      sandboxName: execution.sandboxName,
    });

    if (result.success) {
      // Ensure all changes are committed before moving to the next task
      if (!flags.dryRun) {
        const issueTitle = issue?.title ?? "";
        ensureTaskCommit(projectRoot, task.issue, issueTitle);

        // Sandbox sync is bidirectional with the host workspace, so each task
        // sees the latest committed state.
        if (sandboxed && i < state.tasks.length - 1) {
          process.stderr.write(
            `  ${dim("↻ Sandbox will resync on next task")}\n`
          );
        }
      }
      markTaskDone(state, task.issue, result.prNumber);
    } else {
      markTaskFailed(state, task.issue, result.error ?? "Unknown error");
      saveRunState(projectRoot, state);

      if (config.sprint.stopOnFailure) {
        process.stderr.write(
          `\n${red("✗")} Sprint stopped: task #${task.issue} failed.\n`
        );
        process.stderr.write(`  Resume with: ${bold("locus run --resume")}\n`);
        return;
      }
    }

    saveRunState(projectRoot, state);
  }

  // Sprint complete
  const stats = getRunStats(state);
  process.stderr.write(
    `\n${progressBar(stats.done, stats.total, { label: "Sprint Complete" })}\n`
  );
  process.stderr.write(`\n${bold("Summary:")}\n`);
  process.stderr.write(
    `  ${green("✓")} Done: ${stats.done}  ${red("✗")} Failed: ${stats.failed}  ${dim(`Duration: ${timer.formatted()}`)}\n\n`
  );

  // Create a single PR for the entire sprint
  if (!flags.dryRun && stats.done > 0) {
    const completedTasks = state.tasks
      .filter((t) => t.status === "done")
      .map((t) => ({
        issue: t.issue,
        title: issues.find((i) => i.number === t.issue)?.title,
      }));
    const prNumber = await createSprintPR(
      projectRoot,
      config,
      sprintName,
      branchName,
      completedTasks
    );

    if (prNumber !== undefined) {
      try {
        execSync(`git checkout ${config.agent.baseBranch}`, {
          cwd: projectRoot,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        process.stderr.write(
          `  ${dim(`Checked out ${config.agent.baseBranch}`)}\n`
        );
      } catch {
        // Non-fatal
      }
    }
  }

  if (stats.failed === 0) {
    clearRunState(projectRoot);
  }
}

// ─── Single Issue Execution ─────────────────────────────────────────────────

async function handleSingleIssue(
  projectRoot: string,
  config: LocusConfig,
  issueNumber: number,
  flags: { dryRun?: boolean; model?: string },
  sandboxed: boolean
): Promise<void> {
  const execution = resolveExecutionContext(config, flags.model);

  // Check if issue is in a sprint — sprint issues run on the sprint branch, not worktrees
  let isSprintIssue = false;
  try {
    const issue = getIssue(issueNumber, { cwd: projectRoot });
    isSprintIssue = issue.milestone !== null;
  } catch {
    // Non-fatal — proceed without sprint check
  }

  if (isSprintIssue) {
    process.stderr.write(
      `\n${bold("Running sprint issue")} ${cyan(`#${issueNumber}`)} ${dim("(sequential, no worktree)")}\n\n`
    );

    await executeIssue(projectRoot, {
      issueNumber,
      provider: execution.provider,
      model: execution.model,
      dryRun: flags.dryRun,
      sandboxed,
      sandboxName: execution.sandboxName,
    });
    return;
  }

  // Standalone issue — use a worktree
  process.stderr.write(
    `\n${bold("Running issue")} ${cyan(`#${issueNumber}`)} ${dim("(worktree)")}\n\n`
  );

  let worktreePath: string | undefined;

  if (!flags.dryRun) {
    try {
      const wt = createWorktree(
        projectRoot,
        issueNumber,
        config.agent.baseBranch
      );
      worktreePath = wt.path;
      process.stderr.write(`  ${dim(`Worktree: ${wt.branch}`)}\n\n`);
    } catch (e) {
      process.stderr.write(`${yellow("⚠")} Could not create worktree: ${e}\n`);
      process.stderr.write(
        `  ${dim("Falling back to running in project root.")}\n\n`
      );
    }
  }

  const result = await executeIssue(projectRoot, {
    issueNumber,
    worktreePath,
    provider: execution.provider,
    model: execution.model,
    dryRun: flags.dryRun,
    sandboxed,
    sandboxName: execution.sandboxName,
  });

  // Clean up worktree on success, preserve on failure for debugging
  if (worktreePath && !flags.dryRun) {
    if (result.success) {
      removeWorktree(projectRoot, issueNumber);
      process.stderr.write(`  ${dim("Worktree cleaned up.")}\n`);
    } else {
      process.stderr.write(
        `  ${yellow("⚠")} Worktree preserved for debugging: ${dim(worktreePath)}\n`
      );
    }
  }
}

// ─── Parallel Execution ─────────────────────────────────────────────────────

async function handleParallelRun(
  projectRoot: string,
  config: LocusConfig,
  issueNumbers: number[],
  flags: { dryRun?: boolean; model?: string },
  sandboxed: boolean
): Promise<void> {
  const log = getLogger();
  const execution = resolveExecutionContext(config, flags.model);
  const maxConcurrent = config.agent.maxParallel;
  process.stderr.write(
    `\n${bold("Running")} ${cyan(`${issueNumbers.length} issues`)} ${dim(`(max ${maxConcurrent} parallel, worktrees)`)}\n\n`
  );

  // Clean up any stale worktrees first
  const cleaned = cleanupStaleWorktrees(projectRoot);
  if (cleaned > 0) {
    process.stderr.write(
      `  ${dim(`Cleaned up ${cleaned} stale worktree${cleaned === 1 ? "" : "s"}.`)}\n`
    );
  }

  // Verify none are sprint issues (sprint issues must be sequential)
  if (!flags.dryRun) {
    for (const num of issueNumbers) {
      try {
        const issue = getIssue(num, { cwd: projectRoot });
        if (issue.milestone) {
          process.stderr.write(
            `${red("✗")} Issue #${num} is in sprint "${issue.milestone}". Sprint issues cannot run in parallel.\n`
          );
          process.stderr.write(
            `  Use ${bold("locus run")} to run the sprint sequentially.\n\n`
          );
          return;
        }
      } catch {
        log.verbose(`Could not check if issue #${num} is in a sprint`);
      }
    }
  }

  const state = createParallelRunState(issueNumbers);
  saveRunState(projectRoot, state);

  // Track worktrees created so we can clean them up
  const worktreeMap = new Map<number, string>();

  // Execute in batches with worktrees
  const results: Array<{ issue: number; success: boolean }> = [];

  for (let i = 0; i < issueNumbers.length; i += maxConcurrent) {
    const batch = issueNumbers.slice(i, i + maxConcurrent);
    const promises = batch.map(async (issueNumber) => {
      markTaskInProgress(state, issueNumber);
      saveRunState(projectRoot, state);

      // Create worktree for this issue
      let worktreePath: string | undefined;
      if (!flags.dryRun) {
        try {
          const wt = createWorktree(
            projectRoot,
            issueNumber,
            config.agent.baseBranch
          );
          worktreePath = wt.path;
          worktreeMap.set(issueNumber, wt.path);
          process.stderr.write(
            `  ${dim(`Created worktree for #${issueNumber}: ${wt.branch}`)}\n`
          );
        } catch (e) {
          log.warn(`Could not create worktree for #${issueNumber}: ${e}`);
        }
      }

      const result = await executeIssue(projectRoot, {
        issueNumber,
        worktreePath,
        provider: execution.provider,
        model: execution.model,
        dryRun: flags.dryRun,
        sandboxed,
        sandboxName: execution.sandboxName,
      });

      if (result.success) {
        markTaskDone(state, issueNumber, result.prNumber);
        // Clean up worktree on success
        if (worktreePath) {
          removeWorktree(projectRoot, issueNumber);
          worktreeMap.delete(issueNumber);
        }
      } else {
        markTaskFailed(state, issueNumber, result.error ?? "Unknown error");
        // Preserve worktree on failure for debugging
      }
      saveRunState(projectRoot, state);

      return { issue: issueNumber, success: result.success };
    });

    // Use Promise.allSettled to ensure all sandboxes are cleaned up even if
    // some tasks throw unexpected errors (sandbox cleanup happens in runner
    // finally blocks, but allSettled guarantees we process all outcomes).
    const settled = await Promise.allSettled(promises);
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        // Task promise rejected unexpectedly — extract issue number from batch
        // position and record as failed
        const idx = settled.indexOf(outcome);
        const issueNumber = batch[idx];
        log.warn(`Parallel task #${issueNumber} threw: ${outcome.reason}`);
        results.push({ issue: issueNumber, success: false });
      }
    }
  }

  // Summary
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  process.stderr.write(
    `\n${bold("Summary:")} ${green(`✓ ${succeeded}`)}  ${failed > 0 ? red(`✗ ${failed}`) : dim("✗ 0")}\n`
  );

  // Show preserved worktrees
  if (worktreeMap.size > 0) {
    process.stderr.write(
      `\n${yellow("⚠")} Failed worktrees preserved for debugging:\n`
    );
    for (const [num, path] of worktreeMap) {
      process.stderr.write(`    #${num}: ${dim(path)}\n`);
    }
    process.stderr.write(
      `\n  Retry with: ${bold(`locus run ${Array.from(worktreeMap.keys()).join(" ")}`)}\n`
    );
  }

  process.stderr.write("\n");

  if (failed === 0) {
    clearRunState(projectRoot);
  }
}

// ─── Resume ─────────────────────────────────────────────────────────────────

async function handleResume(
  projectRoot: string,
  config: LocusConfig,
  sandboxed: boolean
): Promise<void> {
  const execution = resolveExecutionContext(config);
  const state = loadRunState(projectRoot);
  if (!state) {
    process.stderr.write(
      `${red("✗")} No run state found. Nothing to resume.\n`
    );
    return;
  }

  const stats = getRunStats(state);
  process.stderr.write(
    `\n${bold("Resuming")} ${state.type} run ${dim(state.runId)}\n`
  );
  process.stderr.write(
    `  Done: ${stats.done}, Failed: ${stats.failed}, Pending: ${stats.pending}\n\n`
  );

  if (state.type === "sprint" && state.branch) {
    // Ensure we're on the right branch
    try {
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      if (currentBranch !== state.branch) {
        execSync(`git checkout ${state.branch}`, {
          cwd: projectRoot,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      }
    } catch {
      process.stderr.write(
        `${yellow("⚠")} Could not checkout branch ${state.branch}\n`
      );
    }
  }

  const isSprintRun = state.type === "sprint";

  // Resume execution
  const timer = createTimer();
  let task = getNextTask(state);

  while (task) {
    // Reset failed tasks to pending for retry
    if (task.status === "failed") {
      task.status = "pending";
      task.error = undefined;
      task.failedAt = undefined;
    }

    markTaskInProgress(state, task.issue);
    saveRunState(projectRoot, state);

    const result = await executeIssue(projectRoot, {
      issueNumber: task.issue,
      provider: execution.provider,
      model: execution.model,
      skipPR: isSprintRun,
      sandboxed,
      sandboxName: execution.sandboxName,
    });

    if (result.success) {
      if (isSprintRun) {
        // Fetch issue title for the commit message if possible
        let issueTitle = "";
        try {
          const iss = getIssue(task.issue, { cwd: projectRoot });
          issueTitle = iss.title;
        } catch {
          // Non-fatal
        }
        ensureTaskCommit(projectRoot, task.issue, issueTitle);

        // Sandbox sync is bidirectional with the host workspace.
        if (sandboxed) {
          process.stderr.write(
            `  ${dim("↻ Sandbox will resync on next task")}\n`
          );
        }
      }
      markTaskDone(state, task.issue, result.prNumber);
    } else {
      markTaskFailed(state, task.issue, result.error ?? "Unknown error");
      saveRunState(projectRoot, state);

      if (config.sprint.stopOnFailure && isSprintRun) {
        process.stderr.write(
          `\n${red("✗")} Sprint stopped: task #${task.issue} failed.\n`
        );
        return;
      }
    }

    saveRunState(projectRoot, state);
    task = getNextTask(state);
  }

  const finalStats = getRunStats(state);
  process.stderr.write(
    `\n${bold("Resume complete:")} ${green(`✓ ${finalStats.done}`)} ${finalStats.failed > 0 ? red(`✗ ${finalStats.failed}`) : ""} ${dim(`(${timer.formatted()})`)}\n\n`
  );

  // Create sprint PR if this was a sprint run and there were completed tasks
  if (isSprintRun && state.branch && state.sprint && finalStats.done > 0) {
    const completedTasks = state.tasks
      .filter((t) => t.status === "done")
      .map((t) => ({ issue: t.issue }));
    const prNumber = await createSprintPR(
      projectRoot,
      config,
      state.sprint,
      state.branch,
      completedTasks
    );

    if (prNumber !== undefined) {
      try {
        execSync(`git checkout ${config.agent.baseBranch}`, {
          cwd: projectRoot,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        process.stderr.write(
          `  ${dim(`Checked out ${config.agent.baseBranch}`)}\n`
        );
      } catch {
        // Non-fatal
      }
    }
  }

  if (finalStats.failed === 0) {
    clearRunState(projectRoot);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sortByOrder(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const orderA = getOrder(a) ?? 999;
    const orderB = getOrder(b) ?? 999;
    return orderA - orderB;
  });
}

function getOrder(issue: Issue): number | null {
  for (const label of issue.labels) {
    const match = label.match(/^order:(\d+)$/);
    if (match) return Number.parseInt(match[1], 10);
  }
  return null;
}

/**
 * Safety-net commit: if the AI left uncommitted changes after a task,
 * stage and commit them so the sprint branch stays clean per task.
 *
 * When the repo uses submodules, only non-submodule files are staged
 * to avoid accidentally committing submodule pointer changes that
 * cannot be pushed to the parent repo's branch.
 */
function ensureTaskCommit(
  projectRoot: string,
  issueNumber: number,
  issueTitle: string
): void {
  try {
    const status = execSync("git status --porcelain", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!status) return;

    const useSubmoduleSafeAdd = existsSync(join(projectRoot, ".gitmodules"));

    if (useSubmoduleSafeAdd) {
      // Stage only non-submodule changes to avoid committing submodule pointer
      // diffs that would require pushing to the submodule's remote first.
      const lines = status.split("\n").filter(Boolean);
      const filesToAdd: string[] = [];

      // Get list of submodule paths
      let submodulePaths: string[] = [];
      try {
        const submoduleStatus = execSync(
          "git submodule status --recursive",
          {
            cwd: projectRoot,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          }
        ).trim();
        submodulePaths = submoduleStatus
          .split("\n")
          .filter(Boolean)
          .map((line) => line.trim().split(/\s+/)[1])
          .filter(Boolean);
      } catch {
        // If submodule status fails, fall back to git add -A
      }

      if (submodulePaths.length > 0) {
        for (const line of lines) {
          // git status --porcelain format: XY <path> or XY <path> -> <path>
          const filePath = line.slice(3).split(" -> ").pop()?.trim();
          if (!filePath) continue;

          // Skip if the file path is a submodule
          const isSubmodule = submodulePaths.some(
            (sp) => filePath === sp || filePath.startsWith(`${sp}/`)
          );
          if (!isSubmodule) {
            filesToAdd.push(filePath);
          }
        }

        if (filesToAdd.length === 0) return;

        // Stage non-submodule files individually
        for (const file of filesToAdd) {
          execSync(`git add -- ${JSON.stringify(file)}`, {
            cwd: projectRoot,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          });
        }
      } else {
        // No submodule paths detected — fall back to git add -A
        execSync("git add -A", {
          cwd: projectRoot,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      }
    } else {
      execSync("git add -A", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    const message = `chore: complete #${issueNumber} - ${issueTitle}\n\nCo-Authored-By: LocusAgent <agent@locusai.team>`;
    execSync(`git commit -F -`, {
      input: message,
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    process.stderr.write(
      `  ${dim(`Committed uncommitted changes for #${issueNumber}`)}\n`
    );
  } catch {
    // Non-fatal — AI may have already committed everything
  }
}

/**
 * Create a single sprint-level PR covering all completed tasks.
 */
async function createSprintPR(
  projectRoot: string,
  config: LocusConfig,
  sprintName: string,
  branchName: string,
  tasks: Array<{ issue: number; title?: string }>
): Promise<number | undefined> {
  if (!config.agent.autoPR) return undefined;

  try {
    const diff = execSync(
      `git diff origin/${config.agent.baseBranch}..HEAD --stat`,
      {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();

    if (!diff) {
      process.stderr.write(`  ${dim("No changes — skipping sprint PR")}\n`);
      return undefined;
    }

    const pushCmd = existsSync(join(projectRoot, ".gitmodules"))
      ? `git push --recurse-submodules=on-demand -u origin ${branchName}`
      : `git push -u origin ${branchName}`;
    execSync(pushCmd, {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const taskLines = tasks
      .map((t) => `- Closes #${t.issue}${t.title ? `: ${t.title}` : ""}`)
      .join("\n");

    const prBody = `## Sprint: ${sprintName}\n\n${taskLines}\n\n---\n\n🤖 Automated by [Locus](https://github.com/locusai/locus)`;

    const prNumber = createPR(
      `Sprint: ${sprintName}`,
      prBody,
      branchName,
      config.agent.baseBranch,
      { cwd: projectRoot }
    );

    process.stderr.write(`  ${green("✓")} Created sprint PR #${prNumber}\n`);
    return prNumber;
  } catch (e) {
    getLogger().warn(`Failed to create sprint PR: ${e}`);
    process.stderr.write(`  ${yellow("⚠")} Could not create sprint PR: ${e}\n`);
    return undefined;
  }
}
