/**
 * `locus discuss` — AI-powered architectural discussions.
 *
 * Discussions are stored locally in `.locus/discussions/` as markdown files.
 * No API dependency — purely local with AI generation.
 *
 * Usage:
 *   locus discuss "Should we use Redis or in-memory caching?"
 *   locus discuss list
 *   locus discuss show <id>
 *   locus discuss delete <id>
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { runAI } from "../ai/run-ai.js";
import { loadConfig } from "../core/config.js";
import { createTimer } from "../display/progress.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import type { LocusConfig } from "../types.js";

// ─── Help ────────────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stderr.write(`
${bold("locus discuss")} — AI-powered architectural discussions

${bold("Usage:")}
  locus discuss "<topic>"          ${dim("# Start a new discussion")}
  locus discuss list               ${dim("# List all discussions")}
  locus discuss show <id>          ${dim("# Show a discussion")}
  locus discuss delete <id>        ${dim("# Delete a discussion")}

${bold("Examples:")}
  locus discuss "Should we use Redis or in-memory caching?"
  locus discuss "Monorepo vs polyrepo for our microservices"
  locus discuss list
  locus discuss show abc123

`);
}

// ─── Paths ───────────────────────────────────────────────────────────────────

function getDiscussionsDir(projectRoot: string): string {
  return join(projectRoot, ".locus", "discussions");
}

function ensureDiscussionsDir(projectRoot: string): string {
  const dir = getDiscussionsDir(projectRoot);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Command ─────────────────────────────────────────────────────────────────

export async function discussCommand(
  projectRoot: string,
  args: string[],
  flags: { model?: string } = {}
): Promise<void> {
  if (args[0] === "help" || args.length === 0) {
    printHelp();
    return;
  }

  const subcommand = args[0];

  if (subcommand === "list") {
    return listDiscussions(projectRoot);
  }

  if (subcommand === "show") {
    return showDiscussion(projectRoot, args[1]);
  }

  if (subcommand === "delete") {
    return deleteDiscussion(projectRoot, args[1]);
  }

  // Everything else is treated as a discussion topic
  const topic = args.join(" ").trim();
  return startDiscussion(projectRoot, topic, flags);
}

// ─── List Discussions ────────────────────────────────────────────────────────

function listDiscussions(projectRoot: string): void {
  const dir = getDiscussionsDir(projectRoot);

  if (!existsSync(dir)) {
    process.stderr.write(`${dim("No discussions yet.")}\n`);
    return;
  }

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  if (files.length === 0) {
    process.stderr.write(`${dim("No discussions yet.")}\n`);
    return;
  }

  process.stderr.write(`\n${bold("Discussions:")}\n\n`);

  for (const file of files) {
    const id = file.replace(".md", "");
    const content = readFileSync(join(dir, file), "utf-8");

    // Extract title from first line (# Title)
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1] : id;

    // Extract date from second line or filename
    const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
    const date = dateMatch ? dateMatch[1] : "";

    process.stderr.write(
      `  ${cyan(id.slice(0, 12))}  ${title.slice(0, 60)}  ${dim(date)}\n`
    );
  }

  process.stderr.write("\n");
}

// ─── Show Discussion ─────────────────────────────────────────────────────────

function showDiscussion(projectRoot: string, id: string | undefined): void {
  if (!id) {
    process.stderr.write(`${red("✗")} Please provide a discussion ID.\n`);
    return;
  }

  const dir = getDiscussionsDir(projectRoot);
  if (!existsSync(dir)) {
    process.stderr.write(`${red("✗")} No discussions found.\n`);
    return;
  }

  // Support partial ID matching
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const match = files.find((f) => f.startsWith(id));

  if (!match) {
    process.stderr.write(`${red("✗")} Discussion "${id}" not found.\n`);
    return;
  }

  const content = readFileSync(join(dir, match), "utf-8");
  process.stdout.write(`${content}\n`);
}

// ─── Delete Discussion ───────────────────────────────────────────────────────

function deleteDiscussion(projectRoot: string, id: string | undefined): void {
  if (!id) {
    process.stderr.write(`${red("✗")} Please provide a discussion ID.\n`);
    return;
  }

  const dir = getDiscussionsDir(projectRoot);
  if (!existsSync(dir)) {
    process.stderr.write(`${red("✗")} No discussions found.\n`);
    return;
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const match = files.find((f) => f.startsWith(id));

  if (!match) {
    process.stderr.write(`${red("✗")} Discussion "${id}" not found.\n`);
    return;
  }

  unlinkSync(join(dir, match));
  process.stderr.write(
    `${green("✓")} Deleted discussion: ${match.replace(".md", "")}\n`
  );
}

// ─── Start New Discussion ────────────────────────────────────────────────────

async function startDiscussion(
  projectRoot: string,
  topic: string,
  flags: { model?: string }
): Promise<void> {
  const config = loadConfig(projectRoot);
  const timer = createTimer();
  const id = generateId();

  process.stderr.write(`\n${bold("Discussion:")} ${cyan(topic)}\n\n`);

  // Build prompt
  const prompt = buildDiscussionPrompt(projectRoot, config, topic);

  // Execute AI (with ESC interrupt support)
  const aiResult = await runAI({
    prompt,
    provider: config.ai.provider,
    model: flags.model ?? config.ai.model,
    cwd: projectRoot,
    activity: "discussion",
  });

  if (aiResult.interrupted) {
    process.stderr.write(`\n${yellow("⚡")} Discussion interrupted.\n`);
    // Still save partial output if there is any
    if (!aiResult.output.trim()) return;
  }

  if (!aiResult.success && !aiResult.interrupted) {
    process.stderr.write(
      `\n${red("✗")} Discussion failed: ${aiResult.error}\n`
    );
    return;
  }

  const output = aiResult.output;

  // Save the discussion
  const dir = ensureDiscussionsDir(projectRoot);
  const date = new Date().toISOString().slice(0, 10);
  const markdown = `# ${topic}\n\n**Date:** ${date}\n**Provider:** ${config.ai.provider} / ${flags.model ?? config.ai.model}\n\n---\n\n${output}\n`;

  writeFileSync(join(dir, `${id}.md`), markdown, "utf-8");

  process.stderr.write(
    `\n${green("✓")} Discussion saved: ${cyan(id)} ${dim(`(${timer.formatted()})`)}\n`
  );
  process.stderr.write(
    `  View with: ${bold(`locus discuss show ${id.slice(0, 8)}`)}\n\n`
  );
}

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildDiscussionPrompt(
  projectRoot: string,
  config: LocusConfig,
  topic: string
): string {
  const parts: string[] = [];

  parts.push(
    `You are a senior software architect helping make decisions for the ${config.github.owner}/${config.github.repo} project.`
  );
  parts.push("");

  // Include LOCUS.md for project context
  const locusPath = join(projectRoot, "LOCUS.md");
  if (existsSync(locusPath)) {
    const content = readFileSync(locusPath, "utf-8");
    parts.push("PROJECT CONTEXT:");
    parts.push(content.slice(0, 3000));
    parts.push("");
  }

  // Include LEARNINGS.md
  const learningsPath = join(projectRoot, ".locus", "LEARNINGS.md");
  if (existsSync(learningsPath)) {
    const content = readFileSync(learningsPath, "utf-8");
    parts.push("PAST LEARNINGS:");
    parts.push(content.slice(0, 2000));
    parts.push("");
  }

  parts.push(`TOPIC: ${topic}`);
  parts.push("");
  parts.push("Please provide a thorough analysis covering:");
  parts.push("1. **Context**: Restate the problem/question and why it matters");
  parts.push("2. **Options**: List all viable approaches with pros/cons");
  parts.push("3. **Recommendation**: Your recommended approach with reasoning");
  parts.push("4. **Trade-offs**: What we gain and what we sacrifice");
  parts.push("5. **Implementation Notes**: Key technical considerations");
  parts.push("6. **Decision**: A clear, actionable conclusion");
  parts.push("");
  parts.push("Be specific to this project's codebase and constraints.");
  parts.push("Reference specific files or patterns where relevant.");

  return parts.join("\n");
}
