/**
 * Prompt builder — assembles context for AI agent execution.
 * Builds structured prompts from issue context, sprint state,
 * project instructions (LOCUS.md), and repository context.
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Issue, LocusConfig } from "../types.js";

// ─── Prompt Builders ────────────────────────────────────────────────────────

export interface PromptContext {
  issue: Issue;
  issueComments?: string[];
  config: LocusConfig;
  projectRoot: string;
  /** Sprint context: what previous tasks accomplished (diff summary). */
  sprintContext?: string;
  /** Position in sprint, e.g., "3 of 5". */
  sprintPosition?: string;
  /** Sprint name for contextual awareness. */
  sprintName?: string;
}

export interface FeedbackContext {
  issue: Issue;
  config: LocusConfig;
  projectRoot: string;
  prDiff: string;
  prComments: string[];
  prNumber: number;
}

/** Build the execution prompt for an issue. */
export function buildExecutionPrompt(ctx: PromptContext): string {
  const sections: string[] = [];

  // System context
  sections.push(buildSystemContext(ctx.projectRoot));

  // Task context
  sections.push(buildTaskContext(ctx.issue, ctx.issueComments));

  // Sprint context (if part of a sprint)
  if (ctx.sprintContext || ctx.sprintPosition) {
    sections.push(
      buildSprintContext(ctx.sprintName, ctx.sprintPosition, ctx.sprintContext)
    );
  }

  // Repository context
  sections.push(buildRepoContext(ctx.projectRoot));

  // Execution rules
  sections.push(buildExecutionRules(ctx.config));

  return sections.join("\n\n---\n\n");
}

/** Build the feedback/iterate prompt for addressing PR review comments. */
export function buildFeedbackPrompt(ctx: FeedbackContext): string {
  const sections: string[] = [];

  // System context
  sections.push(buildSystemContext(ctx.projectRoot));

  // Original task
  sections.push(buildTaskContext(ctx.issue));

  // Current state — PR diff and comments
  sections.push(buildPRContext(ctx.prNumber, ctx.prDiff, ctx.prComments));

  // Instructions for addressing feedback
  sections.push(buildFeedbackInstructions());

  return sections.join("\n\n---\n\n");
}

/** Build a prompt for the interactive REPL. */
export function buildReplPrompt(
  userMessage: string,
  projectRoot: string,
  _config: LocusConfig,
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>
): string {
  const sections: string[] = [];

  // System context (lighter — just LOCUS.md + learnings)
  const locusmd = readFileSafe(join(projectRoot, "LOCUS.md"));
  if (locusmd) {
    sections.push(`# Project Instructions\n\n${locusmd}`);
  }

  const learnings = readFileSafe(join(projectRoot, ".locus", "LEARNINGS.md"));
  if (learnings) {
    sections.push(`# Past Learnings\n\n${learnings}`);
  }

  // Previous conversation history (last 10 exchanges for context)
  if (previousMessages && previousMessages.length > 0) {
    const recent = previousMessages.slice(-10);
    const historyLines = recent.map(
      (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
    );
    sections.push(`# Previous Conversation\n\n${historyLines.join("\n\n")}`);
  }

  // User's current message
  sections.push(`# Current Request\n\n${userMessage}`);

  return sections.join("\n\n---\n\n");
}

// ─── Section Builders ───────────────────────────────────────────────────────

function buildSystemContext(projectRoot: string): string {
  const parts: string[] = ["# System Context"];

  // LOCUS.md — primary project instructions
  const locusmd = readFileSafe(join(projectRoot, "LOCUS.md"));
  if (locusmd) {
    parts.push(`## Project Instructions (LOCUS.md)\n\n${locusmd}`);
  }

  // LEARNINGS.md — accumulated knowledge
  const learnings = readFileSafe(join(projectRoot, ".locus", "LEARNINGS.md"));
  if (learnings) {
    parts.push(`## Past Learnings\n\n${learnings}`);
  }

  // Discussion insights (if any)
  const discussionsDir = join(projectRoot, ".locus", "discussions");
  if (existsSync(discussionsDir)) {
    try {
      const files = readdirSync(discussionsDir)
        .filter((f) => f.endsWith(".md"))
        .slice(0, 3); // Max 3 recent discussions
      for (const file of files) {
        const content = readFileSafe(join(discussionsDir, file));
        if (content) {
          parts.push(
            `## Discussion: ${file.replace(".md", "")}\n\n${content.slice(0, 2000)}`
          );
        }
      }
    } catch {
      // Ignore
    }
  }

  return parts.join("\n\n");
}

function buildTaskContext(issue: Issue, comments?: string[]): string {
  const parts: string[] = [
    `# Task Context`,
    ``,
    `## Issue #${issue.number}: ${issue.title}`,
    ``,
    issue.body || "_No description provided._",
  ];

  // Labels
  const labels = issue.labels.filter(
    (l) => l.startsWith("p:") || l.startsWith("type:")
  );
  if (labels.length > 0) {
    parts.push(`\n**Labels:** ${labels.join(", ")}`);
  }

  // Issue comments (conversation)
  if (comments && comments.length > 0) {
    parts.push(`\n## Issue Comments\n`);
    for (const comment of comments) {
      parts.push(comment);
    }
  }

  return parts.join("\n");
}

function buildSprintContext(
  sprintName?: string,
  position?: string,
  diffSummary?: string
): string {
  const parts: string[] = ["# Sprint Context"];

  if (sprintName) {
    parts.push(`**Sprint:** ${sprintName}`);
  }
  if (position) {
    parts.push(`**Position:** Task ${position}`);
  }

  if (diffSummary) {
    parts.push(
      `\n## Changes from Previous Tasks\n\nThe following changes have already been made by earlier tasks in this sprint:\n\n\`\`\`diff\n${diffSummary}\n\`\`\``
    );
  }

  parts.push(
    `\n**Important:** Build upon the changes from previous tasks. Do not revert or undo their work.`
  );

  return parts.join("\n");
}

function buildRepoContext(projectRoot: string): string {
  const parts: string[] = ["# Repository Context"];

  // File tree (top-level + one level deep, excluding common directories)
  try {
    const tree = execSync(
      "find . -maxdepth 2 -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.locus/*' -not -path '*/dist/*' -not -path '*/build/*' | head -80",
      { cwd: projectRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (tree) {
      parts.push(`## File Tree\n\n\`\`\`\n${tree}\n\`\`\``);
    }
  } catch {
    // Ignore
  }

  // Recent git log
  try {
    const gitLog = execSync("git log --oneline -10", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (gitLog) {
      parts.push(`## Recent Commits\n\n\`\`\`\n${gitLog}\n\`\`\``);
    }
  } catch {
    // Ignore
  }

  // Current branch
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    parts.push(`**Current branch:** ${branch}`);
  } catch {
    // Ignore
  }

  return parts.join("\n\n");
}

function buildExecutionRules(config: LocusConfig): string {
  return `# Execution Rules

1. **Commit format:** Use conventional commits: \`feat: <title> (#<issue>)\`, \`fix: ...\`, \`chore: ...\`. Every commit message MUST be multi-line: the first line is the title, then a blank line, then \`Co-Authored-By: LocusAgent <agent@locusai.team>\` as a Git trailer. Use \`git commit -m "<title>" -m "Co-Authored-By: LocusAgent <agent@locusai.team>"\` (two separate -m flags) to ensure the trailer is on its own line.
2. **Code quality:** Follow existing code style. Run linters/formatters if available.
3. **Testing:** If test files exist for modified code, update them accordingly.
4. **Do NOT:**
   - Run \`git push\` (the orchestrator handles pushing)
   - Modify files outside the scope of this issue
   - Delete or revert changes from previous sprint tasks
   - Introduce new dependencies without clear justification
5. **Base branch:** ${config.agent.baseBranch}
6. **Provider:** ${config.ai.provider} / ${config.ai.model}

When you are done, provide a brief summary of what you changed and why.`;
}

function buildPRContext(
  prNumber: number,
  diff: string,
  comments: string[]
): string {
  const parts: string[] = [
    `# Current State — PR #${prNumber}`,
    ``,
    `## PR Diff`,
    ``,
    "```diff",
    diff.slice(0, 10000), // Truncate very large diffs
    "```",
  ];

  if (comments.length > 0) {
    parts.push(`\n## Review Comments\n`);
    for (const comment of comments) {
      parts.push(comment);
    }
  }

  return parts.join("\n");
}

function buildFeedbackInstructions(): string {
  return `# Instructions

1. Address ALL review feedback from the comments above.
2. Make targeted changes — do NOT rewrite code from scratch.
3. If a reviewer comment is unclear, make your best judgment and note your interpretation.
4. Push changes to the same branch — do NOT create a new PR.
5. When done, summarize what you changed in response to each comment.`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function readFileSafe(path: string): string | null {
  try {
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}
