/**
 * `locus iterate` — Re-execute tasks with PR feedback.
 *
 * Closes the feedback loop: run → review → iterate → review → merge.
 *
 * Usage:
 *   locus iterate                # All open agent:managed PRs with comments
 *   locus iterate --pr 15        # Specific PR
 *   locus iterate 42             # Find PR for issue #42
 *   locus iterate --sprint       # All failed/commented tasks in active sprint
 */

import { execSync } from "node:child_process";
import { iterateOnPR } from "../core/agent.js";
import { loadConfig } from "../core/config.js";
import { getPRComments, listPRs } from "../core/github.js";
import { createTimer } from "../display/progress.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import type { LocusConfig, PullRequest } from "../types.js";

// ─── Help ────────────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stderr.write(`
${bold("locus iterate")} — Re-execute tasks with PR feedback

${bold("Usage:")}
  locus iterate                     ${dim("# All agent PRs with comments")}
  locus iterate --pr <number>       ${dim("# Iterate on specific PR")}
  locus iterate <issue-number>      ${dim("# Find PR for issue and iterate")}
  locus iterate --sprint            ${dim("# All sprint PRs with feedback")}

${bold("Options:")}
  --pr <number>       Iterate on a specific PR
  --sprint            Iterate on active sprint PRs
  --dry-run           Show what would be iterated without executing

${bold("Examples:")}
  locus iterate
  locus iterate --pr 15
  locus iterate 42
  locus iterate --sprint

`);
}

// ─── Command ─────────────────────────────────────────────────────────────────

export async function iterateCommand(
  projectRoot: string,
  args: string[],
  flags: { dryRun?: boolean; model?: string } = {}
): Promise<void> {
  if (args[0] === "help") {
    printHelp();
    return;
  }

  const config = loadConfig(projectRoot);
  let prNumber: number | undefined;
  let issueNumber: number | undefined;
  let sprintMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--pr" && args[i + 1]) {
      prNumber = Number.parseInt(args[++i], 10);
    } else if (args[i] === "--sprint") {
      sprintMode = true;
    } else if (args[i] === "--dry-run") {
      flags.dryRun = true;
    } else if (/^\d+$/.test(args[i])) {
      issueNumber = Number.parseInt(args[i], 10);
    }
  }

  if (prNumber) {
    return handleSinglePR(projectRoot, config, prNumber, flags);
  }

  if (issueNumber) {
    return handleIssue(projectRoot, config, issueNumber, flags);
  }

  if (sprintMode) {
    return handleSprint(projectRoot, config, flags);
  }

  return handleAllPRs(projectRoot, config, flags);
}

// ─── Single PR ───────────────────────────────────────────────────────────────

async function handleSinglePR(
  projectRoot: string,
  config: LocusConfig,
  prNumber: number,
  flags: { dryRun?: boolean; model?: string }
): Promise<void> {
  process.stderr.write(
    `\n${bold("Iterating on PR")} ${cyan(`#${prNumber}`)}\n\n`
  );

  // Check for feedback
  const comments = getPRComments(
    config.github.owner,
    config.github.repo,
    prNumber,
    { cwd: projectRoot }
  );

  if (comments.length === 0) {
    process.stderr.write(
      `${dim("No comments on PR #")}${prNumber}${dim(". Nothing to iterate on.")}\n\n`
    );
    return;
  }

  process.stderr.write(
    `  ${dim(`${comments.length} comment${comments.length === 1 ? "" : "s"} found`)}\n\n`
  );

  if (flags.dryRun) {
    process.stderr.write(
      `${yellow("⚠")} ${bold("Dry run")} — would iterate with ${comments.length} comments.\n\n`
    );
    return;
  }

  const timer = createTimer();
  const result = await iterateOnPR(projectRoot, prNumber, config);

  if (result.success) {
    process.stderr.write(
      `\n${green("✓")} Iteration complete ${dim(`(${timer.formatted()})`)}\n\n`
    );
  } else {
    process.stderr.write(
      `\n${red("✗")} Iteration failed: ${result.error ?? "Unknown error"}\n\n`
    );
  }
}

// ─── Issue → PR ──────────────────────────────────────────────────────────────

async function handleIssue(
  projectRoot: string,
  config: LocusConfig,
  issueNumber: number,
  flags: { dryRun?: boolean; model?: string }
): Promise<void> {
  process.stderr.write(
    `\n${bold("Finding PR for issue")} ${cyan(`#${issueNumber}`)}...\n`
  );

  // Search for PR that closes this issue
  const prNumber = findPRForIssue(projectRoot, issueNumber);

  if (!prNumber) {
    process.stderr.write(
      `${red("✗")} No open PR found for issue #${issueNumber}.\n\n`
    );
    return;
  }

  process.stderr.write(`  Found PR #${prNumber}\n`);
  return handleSinglePR(projectRoot, config, prNumber, flags);
}

// ─── Sprint Mode ─────────────────────────────────────────────────────────────

async function handleSprint(
  projectRoot: string,
  config: LocusConfig,
  flags: { dryRun?: boolean; model?: string }
): Promise<void> {
  if (!config.sprint.active) {
    process.stderr.write(`${red("✗")} No active sprint set.\n`);
    return;
  }

  process.stderr.write(
    `\n${bold("Iterating on sprint:")} ${cyan(config.sprint.active)}\n\n`
  );

  // Get all open agent PRs
  const prs = listPRs(
    { label: "agent:managed", state: "open" },
    { cwd: projectRoot }
  );

  if (prs.length === 0) {
    process.stderr.write(`${dim("No open agent PRs found.")}\n\n`);
    return;
  }

  // Filter to PRs with comments
  const prsWithFeedback = await filterPRsWithFeedback(projectRoot, config, prs);

  if (prsWithFeedback.length === 0) {
    process.stderr.write(
      `${dim("No PRs with unaddressed feedback found.")}\n\n`
    );
    return;
  }

  process.stderr.write(
    `  ${cyan(String(prsWithFeedback.length))} PR${prsWithFeedback.length === 1 ? "" : "s"} with feedback\n\n`
  );

  let succeeded = 0;
  let failed = 0;

  for (const pr of prsWithFeedback) {
    if (flags.dryRun) {
      process.stderr.write(
        `  ${yellow("⚠")} Would iterate on PR #${pr.number}: ${pr.title}\n`
      );
      continue;
    }

    const result = await iterateOnPR(projectRoot, pr.number, config);
    if (result.success) succeeded++;
    else failed++;
  }

  if (flags.dryRun) {
    process.stderr.write(
      `\n${yellow("⚠")} ${bold("Dry run")} — no iterations performed.\n\n`
    );
  } else {
    process.stderr.write(
      `\n${bold("Iteration complete:")} ${green(`✓ ${succeeded}`)}${failed > 0 ? ` ${red(`✗ ${failed}`)}` : ""}\n\n`
    );
  }
}

// ─── All Open PRs ────────────────────────────────────────────────────────────

async function handleAllPRs(
  projectRoot: string,
  config: LocusConfig,
  flags: { dryRun?: boolean; model?: string }
): Promise<void> {
  process.stderr.write(`\n${bold("Finding PRs with feedback...")}\n\n`);

  const prs = listPRs(
    { label: "agent:managed", state: "open" },
    { cwd: projectRoot }
  );

  if (prs.length === 0) {
    process.stderr.write(`${dim("No open agent PRs found.")}\n\n`);
    return;
  }

  const prsWithFeedback = await filterPRsWithFeedback(projectRoot, config, prs);

  if (prsWithFeedback.length === 0) {
    process.stderr.write(
      `${dim("No PRs with unaddressed feedback. Nothing to iterate on.")}\n\n`
    );
    return;
  }

  process.stderr.write(
    `  ${cyan(String(prsWithFeedback.length))} PR${prsWithFeedback.length === 1 ? "" : "s"} with feedback\n\n`
  );

  let succeeded = 0;
  let failed = 0;

  for (const pr of prsWithFeedback) {
    process.stderr.write(`${cyan("●")} PR #${pr.number}: ${pr.title}\n`);

    if (flags.dryRun) {
      process.stderr.write(`  ${yellow("⚠")} Dry run — skipping.\n`);
      continue;
    }

    const result = await iterateOnPR(projectRoot, pr.number, config);
    if (result.success) succeeded++;
    else failed++;
  }

  if (flags.dryRun) {
    process.stderr.write(
      `\n${yellow("⚠")} ${bold("Dry run")} — no iterations performed.\n\n`
    );
  } else {
    process.stderr.write(
      `\n${bold("Summary:")} ${green(`✓ ${succeeded}`)}${failed > 0 ? ` ${red(`✗ ${failed}`)}` : ""}\n\n`
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findPRForIssue(
  projectRoot: string,
  issueNumber: number
): number | undefined {
  try {
    // Search for PRs that reference this issue
    const result = execSync(
      `gh pr list --search "Closes #${issueNumber}" --json number --state open`,
      { cwd: projectRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );

    const parsed = JSON.parse(result) as Array<{ number: number }>;
    if (parsed.length > 0) {
      return parsed[0].number;
    }

    // Also try with the branch naming convention
    const branchResult = execSync(
      `gh pr list --head "locus/issue-${issueNumber}" --json number --state open`,
      { cwd: projectRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );

    const branchParsed = JSON.parse(branchResult) as Array<{ number: number }>;
    if (branchParsed.length > 0) {
      return branchParsed[0].number;
    }
  } catch {
    // Non-fatal
  }

  return undefined;
}

async function filterPRsWithFeedback(
  projectRoot: string,
  config: LocusConfig,
  prs: PullRequest[]
): Promise<PullRequest[]> {
  const result: PullRequest[] = [];

  for (const pr of prs) {
    try {
      const comments = getPRComments(
        config.github.owner,
        config.github.repo,
        pr.number,
        { cwd: projectRoot }
      );

      // A PR has actionable feedback if it has non-bot comments
      const hasFeedback = comments.some((c) => !c.body.startsWith("🤖"));

      if (hasFeedback) {
        result.push(pr);
      }
    } catch {
      // Skip PRs we can't fetch comments for
    }
  }

  return result;
}
