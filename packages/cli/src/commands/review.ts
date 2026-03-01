/**
 * `locus review` — AI-powered code review on pull requests.
 *
 * Usage:
 *   locus review                    # Review all open agent:managed PRs
 *   locus review 15                 # Review a specific PR
 *   locus review 15 --focus "security,performance"
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runAI } from "../ai/run-ai.js";
import { loadConfig } from "../core/config.js";
import { getPRDiff, listPRs } from "../core/github.js";
import {
  checkProviderSandboxMismatch,
  getModelSandboxName,
} from "../core/sandbox.js";
import { createTimer } from "../display/progress.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import type { LocusConfig, PullRequest } from "../types.js";

// ─── Help ────────────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stderr.write(`
${bold("locus review")} — AI-powered code review

${bold("Usage:")}
  locus review                           ${dim("# Review all open agent:managed PRs")}
  locus review <pr-number>               ${dim("# Review a specific PR")}
  locus review <pr-number> --focus <areas> ${dim("# Focus on specific areas")}

${bold("Options:")}
  --focus <areas>     Comma-separated review focus areas
                      (e.g., "security,performance,testing")
  --dry-run           Show what would be reviewed without posting

${bold("Examples:")}
  locus review
  locus review 15
  locus review 15 --focus "security,error-handling"

`);
}

// ─── Command ─────────────────────────────────────────────────────────────────

export async function reviewCommand(
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
  let focus: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--focus" && args[i + 1]) {
      focus = args[++i];
    } else if (args[i] === "--dry-run") {
      flags.dryRun = true;
    } else if (/^\d+$/.test(args[i])) {
      prNumber = Number.parseInt(args[i], 10);
    }
  }

  // Check for provider/sandbox mismatch before AI execution
  if (config.sandbox.enabled) {
    const mismatch = checkProviderSandboxMismatch(
      config.sandbox,
      flags.model ?? config.ai.model,
      config.ai.provider
    );
    if (mismatch) {
      process.stderr.write(`${red("✗")} ${mismatch}\n`);
      return;
    }
  }

  if (prNumber) {
    return reviewSinglePR(projectRoot, config, prNumber, focus, flags);
  }

  return reviewAllPRs(projectRoot, config, focus, flags);
}

// ─── Review All PRs ──────────────────────────────────────────────────────────

async function reviewAllPRs(
  projectRoot: string,
  config: LocusConfig,
  focus: string | undefined,
  flags: { dryRun?: boolean; model?: string }
): Promise<void> {
  process.stderr.write(`\n${bold("Reviewing agent-managed PRs...")}\n\n`);

  const prs = listPRs(
    { label: "agent:managed", state: "open" },
    { cwd: projectRoot }
  );

  if (prs.length === 0) {
    process.stderr.write(`${dim("No open agent:managed PRs found.")}\n\n`);
    return;
  }

  process.stderr.write(`  Found ${cyan(String(prs.length))} open PRs\n\n`);

  let reviewed = 0;
  let failed = 0;

  for (const pr of prs) {
    const success = await reviewPR(projectRoot, config, pr, focus, flags);
    if (success) reviewed++;
    else failed++;
  }

  process.stderr.write(
    `\n${bold("Review complete:")} ${green(`✓ ${reviewed}`)}${failed > 0 ? ` ${red(`✗ ${failed}`)}` : ""}\n\n`
  );
}

// ─── Review Single PR ────────────────────────────────────────────────────────

async function reviewSinglePR(
  projectRoot: string,
  config: LocusConfig,
  prNumber: number,
  focus: string | undefined,
  flags: { dryRun?: boolean; model?: string }
): Promise<void> {
  // Get PR info
  let prInfo: PullRequest;
  try {
    const result = execSync(
      `gh pr view ${prNumber} --json number,title,body,state,headRefName,baseRefName,labels,url,createdAt`,
      { cwd: projectRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const raw = JSON.parse(result);
    prInfo = {
      number: raw.number,
      title: raw.title,
      body: raw.body,
      state: raw.state,
      head: raw.headRefName,
      base: raw.baseRefName,
      labels: (raw.labels ?? []).map((l: { name: string }) => l.name),
      url: raw.url,
      createdAt: raw.createdAt,
    };
  } catch (e) {
    process.stderr.write(`${red("✗")} Could not fetch PR #${prNumber}: ${e}\n`);
    return;
  }

  await reviewPR(projectRoot, config, prInfo, focus, flags);
}

// ─── Core Review Logic ───────────────────────────────────────────────────────

async function reviewPR(
  projectRoot: string,
  config: LocusConfig,
  pr: PullRequest,
  focus: string | undefined,
  flags: { dryRun?: boolean; model?: string }
): Promise<boolean> {
  const timer = createTimer();

  process.stderr.write(
    `${cyan("●")} Reviewing PR #${pr.number}: ${bold(pr.title)}\n`
  );

  // Get PR diff
  let diff: string;
  try {
    diff = getPRDiff(pr.number, { cwd: projectRoot });
  } catch (e) {
    process.stderr.write(`  ${red("✗")} Could not get diff: ${e}\n`);
    return false;
  }

  if (!diff.trim()) {
    process.stderr.write(`  ${dim("No changes in diff — skipping.")}\n`);
    return true;
  }

  // Build review prompt
  const prompt = buildReviewPrompt(projectRoot, config, pr, diff, focus);

  // Execute AI review (with ESC interrupt support)
  const aiResult = await runAI({
    prompt,
    provider: config.ai.provider,
    model: flags.model ?? config.ai.model,
    cwd: projectRoot,
    activity: `PR #${pr.number}`,
    sandboxed: config.sandbox.enabled,
    sandboxName: getModelSandboxName(
      config.sandbox,
      flags.model ?? config.ai.model,
      config.ai.provider
    ),
  });

  if (aiResult.interrupted) {
    process.stderr.write(`  ${yellow("⚡")} Review interrupted.\n`);
    return false;
  }

  if (!aiResult.success) {
    process.stderr.write(`  ${red("✗")} Review failed: ${aiResult.error}\n`);
    return false;
  }

  const output = aiResult.output;

  // Post review as PR comment (if not dry run)
  if (!flags.dryRun) {
    try {
      const reviewBody = `## 🤖 Locus AI Review\n\n${output.slice(0, 60000)}\n\n---\n_Reviewed by Locus AI (${config.ai.provider}/${flags.model ?? config.ai.model})_`;

      execSync(
        `gh pr comment ${pr.number} --body ${JSON.stringify(reviewBody)}`,
        { cwd: projectRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );

      process.stderr.write(
        `  ${green("✓")} Review posted ${dim(`(${timer.formatted()})`)}\n`
      );
    } catch (e) {
      process.stderr.write(
        `  ${yellow("⚠")} Review generated but could not post comment: ${e}\n`
      );
    }
  } else {
    process.stderr.write(
      `  ${yellow("⚠")} ${bold("Dry run")} — review not posted.\n`
    );
  }

  return true;
}

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildReviewPrompt(
  projectRoot: string,
  config: LocusConfig,
  pr: PullRequest,
  diff: string,
  focus: string | undefined
): string {
  const parts: string[] = [];

  parts.push(
    `<role>\nYou are an expert code reviewer for the ${config.github.owner}/${config.github.repo} repository.\n</role>`
  );

  // Include LOCUS.md for project context
  const locusPath = join(projectRoot, ".locus", "LOCUS.md");
  if (existsSync(locusPath)) {
    const content = readFileSync(locusPath, "utf-8");
    parts.push(
      `<project-context>\n${content.slice(0, 2000)}\n</project-context>`
    );
  }

  const prMeta = [`Branch: ${pr.head} → ${pr.base}`];
  if (pr.body) {
    prMeta.push(`Description:\n${pr.body.slice(0, 1000)}`);
  }
  parts.push(
    `<pull-request number="${pr.number}" title="${pr.title}">\n${prMeta.join("\n")}\n</pull-request>`
  );

  parts.push(`<diff>\n${diff.slice(0, 50000)}\n</diff>`);

  let instructions = `Provide a thorough code review. For each issue found, describe:
1. The file and approximate location
2. What the issue is
3. Why it matters
4. How to fix it

Categories to check:
- Correctness: bugs, logic errors, edge cases
- Security: injection, XSS, auth issues, secret exposure
- Performance: N+1 queries, unnecessary allocations, missing caching
- Maintainability: naming, complexity, code organization
- Testing: missing tests, inadequate coverage`;

  if (focus) {
    instructions += `\n\n**Focus areas:** ${focus}\nPay special attention to the above areas.`;
  }

  instructions += `\n\nEnd with an overall assessment: APPROVE, REQUEST_CHANGES, or COMMENT.
Be constructive and specific. Praise good patterns too.`;

  parts.push(`<review-instructions>\n${instructions}\n</review-instructions>`);

  return parts.join("\n\n");
}
