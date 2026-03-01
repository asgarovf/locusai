/**
 * Agent execution engine — orchestrates AI runner for issues.
 * Handles single issue execution, sprint sequential execution,
 * and parallel standalone execution.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runAI } from "../ai/run-ai.js";
import { createTimer } from "../display/progress.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import type {
  AgentOptions,
  AgentResult,
  Issue,
  LocusConfig,
} from "../types.js";
import { loadConfig } from "./config.js";
import {
  addIssueComment,
  createPR,
  getIssue,
  getPRComments,
  getPRDiff,
  updateIssueLabels,
} from "./github.js";
import { getLogger } from "./logger.js";
import { buildExecutionPrompt, buildFeedbackPrompt } from "./prompt-builder.js";
import { getModelSandboxName } from "./sandbox.js";

/**
 * Execute a single issue using the AI agent.
 */
export async function executeIssue(
  projectRoot: string,
  options: AgentOptions
): Promise<AgentResult> {
  const log = getLogger();
  const timer = createTimer();
  const config = loadConfig(projectRoot);
  const { issueNumber, provider, model, dryRun } = options;

  log.info(`Executing issue #${issueNumber}`, { provider, model });

  // Fetch issue details
  let issue: Issue;
  try {
    issue = getIssue(issueNumber, { cwd: projectRoot });
  } catch (e) {
    return {
      issueNumber,
      success: false,
      error: `Failed to fetch issue #${issueNumber}: ${e}`,
    };
  }

  process.stderr.write(
    `\n${cyan("●")} ${bold(`#${issueNumber}`)} ${issue.title}\n`
  );

  // Label as in-progress
  if (config.agent.autoLabel && !dryRun) {
    try {
      updateIssueLabels(
        issueNumber,
        ["locus:in-progress"],
        ["locus:queued", "locus:failed"],
        { cwd: projectRoot }
      );
    } catch {
      log.warn("Could not update issue labels");
    }
  }

  // Fetch issue comments for context
  let issueComments: string[] = [];
  try {
    const commentsRaw = execSync(
      `gh issue view ${issueNumber} --json comments --jq '.comments[].body'`,
      { cwd: projectRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (commentsRaw) {
      issueComments = commentsRaw.split("\n").filter(Boolean);
    }
  } catch {
    // Non-fatal
  }

  // Build prompt
  const prompt = buildExecutionPrompt({
    issue,
    issueComments,
    config,
    projectRoot,
    sprintContext: options.sprintContext,
  });

  if (dryRun) {
    process.stderr.write(
      `\n${yellow("⚠")} ${bold("Dry run")} — would execute with:\n`
    );
    process.stderr.write(`  Provider: ${provider} / ${model}\n`);
    process.stderr.write(`  Prompt length: ${prompt.length} chars\n`);
    process.stderr.write(
      `  Working directory: ${options.worktreePath ?? projectRoot}\n\n`
    );
    return {
      issueNumber,
      success: true,
      summary: "Dry run — no changes made",
    };
  }

  // Execute AI agent with interrupt support
  const aiResult = await runAI({
    prompt,
    provider,
    model,
    cwd: options.worktreePath ?? projectRoot,
    activity: `issue #${issueNumber}`,
    sandboxed: options.sandboxed,
    sandboxName: options.sandboxName,
  });

  const output = aiResult.output;

  if (aiResult.interrupted) {
    process.stderr.write(
      `\n${yellow("⚡")} Issue #${issueNumber} interrupted ${dim(`(${timer.formatted()})`)}\n`
    );
    return {
      issueNumber,
      success: false,
      error: "Interrupted by user",
    };
  }

  if (!aiResult.success) {
    // Mark as failed
    if (config.agent.autoLabel) {
      try {
        updateIssueLabels(
          issueNumber,
          ["locus:failed"],
          ["locus:in-progress"],
          { cwd: projectRoot }
        );
      } catch {
        // Non-fatal
      }
    }

    // Comment on issue with error
    const errorMsg = aiResult.error ?? "Unknown error";
    try {
      addIssueComment(
        issueNumber,
        `🤖 **Locus execution failed**\n\n\`\`\`\n${errorMsg.slice(0, 1000)}\n\`\`\`\n\nDuration: ${timer.formatted()}`,
        { cwd: projectRoot }
      );
    } catch {
      // Non-fatal
    }

    process.stderr.write(
      `\n${red("✗")} Issue #${issueNumber} failed: ${errorMsg}\n`
    );
    process.stderr.write(`  ${dim(`Duration: ${timer.formatted()}`)}\n`);

    return {
      issueNumber,
      success: false,
      error: errorMsg,
    };
  }

  // Success — commit, PR, labels
  process.stderr.write(
    `\n${green("✓")} Issue #${issueNumber} completed ${dim(`(${timer.formatted()})`)}\n`
  );

  // Create PR if configured and not skipped (sprint runs use a single sprint-level PR)
  let prNumber: number | undefined;
  if (config.agent.autoPR && !options.skipPR) {
    prNumber = await createIssuePR(projectRoot, config, issue);
  }

  // Label as done
  if (config.agent.autoLabel) {
    try {
      updateIssueLabels(issueNumber, ["locus:done"], ["locus:in-progress"], {
        cwd: projectRoot,
      });
    } catch {
      // Non-fatal
    }
  }

  // Comment on issue with summary
  const summary = extractSummary(output);
  try {
    addIssueComment(
      issueNumber,
      `🤖 **Locus execution complete**\n\n${summary}\n\nDuration: ${timer.formatted()}${prNumber ? `\nPR: #${prNumber}` : ""}`,
      { cwd: projectRoot }
    );
  } catch {
    // Non-fatal
  }

  return {
    issueNumber,
    success: true,
    prNumber,
    summary,
  };
}

/**
 * Re-execute an issue with PR feedback (iterate mode).
 */
export async function iterateOnPR(
  projectRoot: string,
  prNumber: number,
  config: LocusConfig
): Promise<AgentResult> {
  const _log = getLogger();
  const timer = createTimer();

  // Fetch PR info to find linked issue
  const diff = getPRDiff(prNumber, { cwd: projectRoot });
  const comments = getPRComments(
    config.github.owner,
    config.github.repo,
    prNumber,
    { cwd: projectRoot }
  );

  // Build feedback prompt
  // Try to extract issue number from PR body
  const issueNumber = 0; // Would be extracted from PR body "Closes #N"

  process.stderr.write(`\n${cyan("●")} Iterating on PR #${prNumber}\n`);

  const prompt = buildFeedbackPrompt({
    issue: {
      number: issueNumber,
      title: `PR #${prNumber} feedback`,
      body: "",
      state: "open",
      labels: [],
      milestone: null,
      assignees: [],
      url: "",
      createdAt: "",
      updatedAt: "",
    },
    config,
    projectRoot,
    prDiff: diff,
    prComments: comments.map(
      (c) =>
        `**${c.user}** ${c.path ? `(${c.path}:${c.line})` : ""}:\n${c.body}`
    ),
    prNumber,
  });

  const aiResult = await runAI({
    prompt,
    provider: config.ai.provider,
    model: config.ai.model,
    cwd: projectRoot,
    activity: `iterating on PR #${prNumber}`,
    sandboxed: config.sandbox.enabled,
    sandboxName: getModelSandboxName(
      config.sandbox,
      config.ai.model,
      config.ai.provider
    ),
  });

  if (aiResult.interrupted) {
    process.stderr.write(
      `\n${yellow("⚡")} Iteration interrupted ${dim(`(${timer.formatted()})`)}\n`
    );
  } else {
    process.stderr.write(
      `\n${aiResult.success ? green("✓") : red("✗")} Iteration ${aiResult.success ? "complete" : "failed"} ${dim(`(${timer.formatted()})`)}\n`
    );
  }

  return {
    issueNumber,
    success: aiResult.success,
    prNumber,
    error: aiResult.error,
    summary: extractSummary(aiResult.output),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createIssuePR(
  projectRoot: string,
  config: LocusConfig,
  issue: Issue
): Promise<number | undefined> {
  try {
    // Check if there are commits to push
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const diff = execSync(
      `git diff origin/${config.agent.baseBranch}..HEAD --stat`,
      {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();

    if (!diff) {
      getLogger().verbose("No changes to create PR for");
      return undefined;
    }

    // Push branch (with submodule support if applicable)
    const pushCmd = existsSync(join(projectRoot, ".gitmodules"))
      ? `git push --recurse-submodules=on-demand -u origin ${currentBranch}`
      : `git push -u origin ${currentBranch}`;
    execSync(pushCmd, {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Create PR
    const prTitle = `${issue.title} (#${issue.number})`;
    const prBody = `Closes #${issue.number}\n\n---\n\n🤖 Automated by [Locus](https://github.com/locusai/locus)`;

    const prNumber = createPR(
      prTitle,
      prBody,
      currentBranch,
      config.agent.baseBranch,
      { cwd: projectRoot }
    );

    process.stderr.write(`  ${green("✓")} Created PR #${prNumber}\n`);

    return prNumber;
  } catch (e) {
    getLogger().warn(`Failed to create PR: ${e}`);
    return undefined;
  }
}

function extractSummary(output: string): string {
  // Try to extract the last meaningful paragraph from AI output
  const lines = output.trim().split("\n");
  const lastParagraph: string[] = [];

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line && lastParagraph.length > 0) break;
    if (line) lastParagraph.unshift(line);
  }

  const summary = lastParagraph.join("\n").slice(0, 500);
  return summary || "Execution completed.";
}
