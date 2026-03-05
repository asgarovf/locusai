/**
 * `locus commit` — AI-powered commit message generation.
 *
 * Usage:
 *   locus commit                # Analyze staged changes and commit
 *   locus commit --dry-run      # Preview the generated message
 *   locus commit --model <name> # Override AI model
 */

import { execSync } from "node:child_process";
import { runAI } from "../ai/run-ai.js";
import { inferProviderFromModel } from "../core/ai-models.js";
import { loadConfig } from "../core/config.js";
import { getModelSandboxName } from "../core/sandbox.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";

// ─── Help ────────────────────────────────────────────────────────────────────

function printCommitHelp(): void {
  process.stderr.write(`
${bold("locus commit")} — AI-powered commit message generation

${bold("Usage:")}
  locus commit                       ${dim("# Analyze staged changes and commit")}
  locus commit --dry-run             ${dim("# Preview message without committing")}
  locus commit --model <name>        ${dim("# Override AI model")}

${bold("Options:")}
  --dry-run             Show the generated message without committing
  --model <name>        Override the AI model for message generation

${bold("How it works:")}
  1. Reads your staged changes (git diff --cached)
  2. Reads recent commit history for style matching
  3. Uses AI to generate a conventional commit message
  4. Appends Co-Authored-By trailer and commits

${bold("Examples:")}
  locus commit                       ${dim("# Stage changes, then run")}
  locus commit --dry-run             ${dim("# Preview before committing")}

`);
}

// ─── Command ─────────────────────────────────────────────────────────────────

export async function commitCommand(
  projectRoot: string,
  args: string[],
  flags: {
    dryRun?: boolean;
    model?: string;
  } = {}
): Promise<void> {
  if (args[0] === "help") {
    printCommitHelp();
    return;
  }

  const config = loadConfig(projectRoot);

  // Check for staged changes
  let stagedDiff: string;
  try {
    stagedDiff = execSync("git diff --cached", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    process.stderr.write(`${red("✗")} Failed to read staged changes.\n`);
    return;
  }

  if (!stagedDiff) {
    process.stderr.write(
      `${red("✗")} No staged changes. Stage files first with ${bold("git add")}.\n`
    );
    return;
  }

  // Get staged file summary for context
  let stagedStat: string;
  try {
    stagedStat = execSync("git diff --cached --stat", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    stagedStat = "";
  }

  // Get recent commit messages for style matching
  let recentCommits: string;
  try {
    recentCommits = execSync("git log --oneline -10", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    recentCommits = "";
  }

  process.stderr.write(`\n${bold("Analyzing staged changes...")}\n`);
  process.stderr.write(`${dim(stagedStat)}\n\n`);

  // Build the prompt
  const prompt = buildCommitPrompt(stagedDiff, stagedStat, recentCommits);

  // Resolve AI model
  const model = flags.model ?? config.ai.model;
  const provider = inferProviderFromModel(model) ?? config.ai.provider;
  const sandboxName = getModelSandboxName(config.sandbox, model, provider);

  // Run AI to generate the commit message
  const result = await runAI({
    prompt,
    provider,
    model,
    cwd: projectRoot,
    activity: "Generating commit message",
    silent: true,
    noInterrupt: true,
    sandboxed: !!sandboxName,
    sandboxName,
    containerWorkdir: config.sandbox.containerWorkdir,
  });

  if (!result.success) {
    process.stderr.write(
      `${red("✗")} Failed to generate commit message: ${result.error}\n`
    );
    return;
  }

  // Extract the commit message from AI output
  const commitMessage = extractCommitMessage(result.output);

  if (!commitMessage) {
    process.stderr.write(
      `${red("✗")} Could not extract a commit message from AI response.\n`
    );
    return;
  }

  // Append co-authored trailer
  const fullMessage = `${commitMessage}\n\nCo-Authored-By: LocusAgent <agent@locusai.team>`;

  // Display the message
  process.stderr.write(`${bold("Generated commit message:")}\n`);
  process.stderr.write(`${cyan("─".repeat(50))}\n`);
  process.stderr.write(`${fullMessage}\n`);
  process.stderr.write(`${cyan("─".repeat(50))}\n\n`);

  if (flags.dryRun) {
    process.stderr.write(
      `${yellow("⚠")} ${bold("Dry run")} — no commit created.\n\n`
    );
    return;
  }

  // Commit
  try {
    execSync("git commit -F -", {
      input: fullMessage,
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    process.stderr.write(`${green("✓")} Committed successfully.\n\n`);
  } catch (e) {
    process.stderr.write(
      `${red("✗")} Commit failed: ${(e as Error).message}\n`
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCommitPrompt(
  diff: string,
  stat: string,
  recentCommits: string
): string {
  // Truncate very large diffs to avoid exceeding context limits
  const maxDiffLength = 15000;
  const truncatedDiff =
    diff.length > maxDiffLength
      ? `${diff.slice(0, maxDiffLength)}\n\n... [diff truncated — ${diff.length - maxDiffLength} chars omitted]`
      : diff;

  let prompt = `You are a commit message generator. Analyze the following staged git changes and generate a single, concise conventional commit message.

Rules:
- Use conventional commit format: type(scope): description
- Types: feat, fix, chore, refactor, docs, test, style, perf, ci, build
- Keep the first line under 72 characters
- Add a body paragraph (separated by blank line) ONLY if the changes are complex enough to warrant explanation
- Do NOT include any markdown formatting, code blocks, or extra commentary
- Output ONLY the commit message text — nothing else

`;

  if (recentCommits) {
    prompt += `Recent commits (for style reference):
${recentCommits}

`;
  }

  prompt += `File summary:
${stat}

Diff:
${truncatedDiff}`;

  return prompt;
}

function extractCommitMessage(output: string): string | null {
  const trimmed = output.trim();
  if (!trimmed) return null;

  // Remove markdown code blocks if the AI wrapped the response
  let cleaned = trimmed;
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
  }

  // Remove leading/trailing quotes if present
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned.trim() || null;
}
