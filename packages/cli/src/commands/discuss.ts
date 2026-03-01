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
 *   locus discuss plan <id>
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
import {
  checkProviderSandboxMismatch,
  getModelSandboxName,
} from "../core/sandbox.js";
import { createTimer } from "../display/progress.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import { InputHandler } from "../repl/input-handler.js";
import type { LocusConfig } from "../types.js";
import { planCommand } from "./plan.js";

// ─── Help ────────────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stderr.write(`
${bold("locus discuss")} — AI-powered architectural discussions

${bold("Usage:")}
  locus discuss "<topic>"          ${dim("# Start a new discussion")}
  locus discuss list               ${dim("# List all discussions")}
  locus discuss show <id>          ${dim("# Show a discussion")}
  locus discuss plan <id>          ${dim("# Convert discussion to a plan")}
  locus discuss delete <id>        ${dim("# Delete a discussion")}

${bold("Examples:")}
  locus discuss "Should we use Redis or in-memory caching?"
  locus discuss "Monorepo vs polyrepo for our microservices"
  locus discuss list
  locus discuss show abc123
  locus discuss plan abc123

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
  if (args[0] === "help") {
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

  if (subcommand === "plan") {
    return convertDiscussionToPlan(projectRoot, args[1]);
  }

  if (subcommand === "delete") {
    return deleteDiscussion(projectRoot, args[1]);
  }

  if (args.length === 0) {
    printHelp();
    return;
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

// ─── Convert Discussion to Plan ──────────────────────────────────────────────

async function convertDiscussionToPlan(
  projectRoot: string,
  id: string | undefined
): Promise<void> {
  if (!id) {
    process.stderr.write(`${red("✗")} Please provide a discussion ID.\n`);
    process.stderr.write(`  Usage: ${bold("locus discuss plan <id>")}\n`);
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

  const content = readFileSync(join(dir, match), "utf-8");

  // Extract discussion title for a readable directive
  const titleMatch = content.match(/^#\s+(.+)/m);
  const discussionTitle = titleMatch ? titleMatch[1].trim() : id;

  await planCommand(
    projectRoot,
    [
      `Create implementation plan from discussion: "${discussionTitle}"\n\nDISCUSSION CONTENT:\n${content.slice(0, 8000)}`,
    ],
    {}
  );
}

// ─── Interactive Answer Prompt ───────────────────────────────────────────────

async function promptForAnswers(): Promise<string> {
  const input = new InputHandler({
    prompt: `${cyan("you")} ${dim(">")} `,
  });

  const result = await input.readline();

  if (result.type === "submit") {
    return result.text.trim();
  }

  // Interrupted or exited
  return "";
}

// ─── Conversation Types ───────────────────────────────────────────────────────

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

// ─── Detect Response Type ─────────────────────────────────────────────────────

/**
 * Returns true if the response looks like a questions-asking response
 * (not yet a final analysis document).
 *
 * Heuristic: a final analysis starts with a markdown heading (#) or
 * has no question marks at all. Questions always have multiple "?" marks.
 */
function isQuestionsResponse(output: string): boolean {
  const trimmed = output.trimStart();
  // Markdown document → final analysis
  if (trimmed.startsWith("#")) return false;
  // Count question marks — final analysis usually has few standalone questions
  const questionMarks = (trimmed.match(/\?/g) ?? []).length;
  return questionMarks >= 2;
}

// ─── Start New Discussion ────────────────────────────────────────────────────

const MAX_DISCUSSION_ROUNDS = 5;

async function startDiscussion(
  projectRoot: string,
  topic: string,
  flags: { model?: string }
): Promise<void> {
  const config = loadConfig(projectRoot);
  const timer = createTimer();
  const id = generateId();

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

  process.stderr.write(`\n${bold("Discussion:")} ${cyan(topic)}\n\n`);

  const conversation: ConversationTurn[] = [];
  let finalAnalysis = "";

  for (let round = 0; round < MAX_DISCUSSION_ROUNDS; round++) {
    const isFinalRound = round === MAX_DISCUSSION_ROUNDS - 1;
    const prompt = buildDiscussionPrompt(
      projectRoot,
      config,
      topic,
      conversation,
      isFinalRound
    );

    const aiResult = await runAI({
      prompt,
      provider: config.ai.provider,
      model: flags.model ?? config.ai.model,
      cwd: projectRoot,
      activity: "discussion",
      sandboxed: config.sandbox.enabled,
      sandboxName: getModelSandboxName(
        config.sandbox,
        flags.model ?? config.ai.model,
        config.ai.provider
      ),
    });

    if (aiResult.interrupted) {
      process.stderr.write(`\n${yellow("⚡")} Discussion interrupted.\n`);
      if (!aiResult.output.trim()) return;
      finalAnalysis = aiResult.output.trim();
      break;
    }

    if (!aiResult.success && !aiResult.interrupted) {
      process.stderr.write(
        `\n${red("✗")} Discussion failed: ${aiResult.error}\n`
      );
      return;
    }

    const response = aiResult.output.trim();
    conversation.push({ role: "assistant", content: response });

    // Detect if this is the final analysis or more questions
    if (!isQuestionsResponse(response) || isFinalRound) {
      finalAnalysis = response;
      break;
    }

    // AI asked questions — prompt the user for answers
    process.stderr.write(
      `\n${dim("─".repeat(50))}\n${bold("Your answers:")} ${dim("(Shift+Enter for newlines, Enter to submit)")}\n\n`
    );

    const answers = await promptForAnswers();

    if (!answers.trim()) {
      // User skipped — push them toward analysis
      conversation.push({
        role: "user",
        content:
          "Please proceed with your analysis based on the information available.",
      });
    } else {
      conversation.push({ role: "user", content: answers });
    }

    process.stderr.write(`\n`);
  }

  if (!finalAnalysis) return;

  // ── Save discussion ─────────────────────────────────────────────────────────

  const dir = ensureDiscussionsDir(projectRoot);
  const date = new Date().toISOString().slice(0, 10);

  const transcript = conversation
    .map((turn) => {
      const label = turn.role === "user" ? "You" : "AI";
      return `**${label}:**\n\n${turn.content}`;
    })
    .join("\n\n---\n\n");

  const markdown = [
    `# ${topic}`,
    ``,
    `**Date:** ${date}`,
    `**Provider:** ${config.ai.provider} / ${flags.model ?? config.ai.model}`,
    ``,
    `---`,
    ``,
    finalAnalysis,
    ``,
    ...(conversation.length > 1
      ? [`---`, ``, `## Discussion Transcript`, ``, transcript, ``]
      : []),
  ].join("\n");

  writeFileSync(join(dir, `${id}.md`), markdown, "utf-8");

  process.stderr.write(
    `\n${green("✓")} Discussion saved: ${cyan(id)} ${dim(`(${timer.formatted()})`)}\n`
  );
  process.stderr.write(
    `  View with: ${bold(`locus discuss show ${id.slice(0, 8)}`)}\n`
  );
  process.stderr.write(
    `  Plan with: ${bold(`locus discuss plan ${id.slice(0, 8)}`)}\n\n`
  );
}

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildDiscussionPrompt(
  projectRoot: string,
  config: LocusConfig,
  topic: string,
  conversation: ConversationTurn[],
  forceFinal: boolean
): string {
  const parts: string[] = [];

  parts.push(
    `<role>\nYou are a senior software architect and consultant for the ${config.github.owner}/${config.github.repo} project.\n</role>`
  );

  // Include LOCUS.md for project context
  const locusPath = join(projectRoot, ".locus", "LOCUS.md");
  if (existsSync(locusPath)) {
    const content = readFileSync(locusPath, "utf-8");
    parts.push(
      `<project-context>\n${content.slice(0, 3000)}\n</project-context>`
    );
  }

  // Include LEARNINGS.md
  const learningsPath = join(projectRoot, ".locus", "LEARNINGS.md");
  if (existsSync(learningsPath)) {
    const content = readFileSync(learningsPath, "utf-8");
    parts.push(
      `<past-learnings>\n${content.slice(0, 2000)}\n</past-learnings>`
    );
  }

  parts.push(`<discussion-topic>\n${topic}\n</discussion-topic>`);

  if (conversation.length === 0) {
    // First round: gather information
    parts.push(
      `<instructions>
Before providing recommendations, you need to ask targeted clarifying questions.

Ask 3-5 focused questions that will significantly improve the quality of your analysis.
Format as a numbered list. Be specific and focused on the most important unknowns.
Do NOT provide any analysis yet — questions only.
</instructions>`
    );
  } else {
    // Include conversation history
    const historyLines: string[] = [];
    for (const turn of conversation) {
      if (turn.role === "user") {
        historyLines.push(`USER: ${turn.content}`);
      } else {
        historyLines.push(`ASSISTANT: ${turn.content}`);
      }
    }
    parts.push(
      `<conversation-history>\n${historyLines.join("\n\n")}\n</conversation-history>`
    );

    if (forceFinal) {
      parts.push(
        `<instructions>
Based on everything discussed, provide your complete analysis and recommendations now.
Format as a thorough markdown document with a clear title (# Heading), sections, trade-offs, and actionable recommendations.
</instructions>`
      );
    } else {
      parts.push(
        `<instructions>
Review the information gathered so far.

If you have enough information to make a thorough recommendation:
  → Provide a complete analysis as a markdown document with a title (# Heading), sections, trade-offs, and concrete recommendations.

If you still need key information to give a good answer:
  → Ask 2-3 more focused follow-up questions (numbered list only, no analysis yet).
</instructions>`
      );
    }
  }

  return parts.join("\n\n");
}
