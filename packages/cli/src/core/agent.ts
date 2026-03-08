/**
 * Agent execution engine — orchestrates AI runner for issues.
 * Handles single issue execution, sprint sequential execution,
 * and parallel standalone execution.
 */

import { execSync } from "node:child_process";
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
import { captureMemoryFromSession, prepareTranscript } from "./memory-capture.js";
import { buildExecutionPrompt, buildFeedbackPrompt } from "./prompt-builder.js";
import { getModelSandboxName } from "./sandbox.js";
import {
  commitDirtySubmodules,
  getSubmoduleChangeSummary,
  pushSubmoduleBranches,
} from "./submodule.js";

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
    containerWorkdir: options.containerWorkdir,
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
    const workDir = options.worktreePath ?? projectRoot;
    prNumber = await createIssuePR(workDir, config, issue);
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

  // Fire-and-forget: capture memory from session transcript
  const transcript = prepareTranscript([
    { role: "user", content: `Issue #${issueNumber}: ${issue.title}\n\n${issue.body}` },
    { role: "assistant", content: output },
  ]);
  captureMemoryFromSession(projectRoot, transcript, { model: config.ai?.model })
    .then((result) => {
      if (result.captured > 0) log.info(`Captured ${result.captured} memory entries`);
    })
    .catch(() => {});

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
    containerWorkdir: config.sandbox.containerWorkdir,
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
  workDir: string,
  config: LocusConfig,
  issue: Issue
): Promise<number | undefined> {
  try {
    // Safety-net: commit any uncommitted changes left by the AI agent
    try {
      commitDirtySubmodules(workDir, issue.number, issue.title);

      const status = execSync("git status --porcelain", {
        cwd: workDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      if (status) {
        execSync("git add -A", {
          cwd: workDir,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });

        const message = `chore: complete #${issue.number} - ${issue.title}\n\nCo-Authored-By: LocusAgent <agent@locusai.team>`;
        execSync("git commit -F -", {
          input: message,
          cwd: workDir,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });

        process.stderr.write(
          `  ${dim(`Committed uncommitted changes for #${issue.number}`)}\n`
        );
      }
    } catch {
      // Non-fatal — AI may have already committed everything
    }

    // Check if there are commits to push
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: workDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const diff = execSync(
      `git diff origin/${config.agent.baseBranch}..HEAD --stat`,
      {
        cwd: workDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();

    if (!diff) {
      process.stderr.write(
        `  ${yellow("⚠")} No changes detected — skipping PR creation\n`
      );
      return undefined;
    }

    // Push submodule branches first (if any) so parent refs are valid
    pushSubmoduleBranches(workDir);

    // Push branch
    execSync(`git push -u origin ${currentBranch}`, {
      cwd: workDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Build PR body, including submodule change summary if applicable
    const submoduleSummary = getSubmoduleChangeSummary(
      workDir,
      config.agent.baseBranch
    );
    let prBody = `Closes #${issue.number}`;
    if (submoduleSummary) {
      prBody += `\n\n${submoduleSummary}`;
    }
    prBody += `\n\n---\n\n🤖 Automated by [Locus](https://github.com/asgarovf/locusai)`;

    // Create or update PR
    const prTitle = `${issue.title} (#${issue.number})`;

    // Check if a PR already exists for this branch
    let prNumber: number | undefined;
    try {
      const existing = execSync(
        `gh pr list --head ${currentBranch} --base ${config.agent.baseBranch} --json number --limit 1`,
        { cwd: workDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed) && parsed.length > 0) {
        prNumber = parsed[0].number;
      }
    } catch {
      // Non-fatal — fall through to create
    }

    if (prNumber) {
      // Update existing PR with latest title and body
      try {
        execSync(
          `gh pr edit ${prNumber} --title ${JSON.stringify(prTitle)} --body-file -`,
          {
            input: prBody,
            cwd: workDir,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          }
        );
        process.stderr.write(
          `  ${green("✓")} Updated existing PR #${prNumber}\n`
        );
      } catch (editErr) {
        getLogger().warn(`Failed to update PR #${prNumber}: ${editErr}`);
      }
    } else {
      prNumber = createPR(
        prTitle,
        prBody,
        currentBranch,
        config.agent.baseBranch,
        { cwd: workDir }
      );
      process.stderr.write(`  ${green("✓")} Created PR #${prNumber}\n`);
    }

    return prNumber;
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`  ${red("✗")} Failed to create PR: ${errorMsg}\n`);
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
