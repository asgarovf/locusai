/**
 * `locus plan` — AI-powered sprint planning.
 *
 * Usage:
 *   locus plan "Build a user auth system"          # AI creates issues + sprint
 *   locus plan --from-issues --sprint "Sprint 2"   # Organize existing issues
 *   locus plan --interactive "Improve API perf"    # Interactive clarification
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runAI } from "../ai/run-ai.js";
import { loadConfig } from "../core/config.js";
import {
  createIssue,
  createMilestone,
  ensureOrderLabel,
  listIssues,
  listMilestones,
  reopenMilestone,
  updateIssueLabels,
} from "../core/github.js";
import {
  bold,
  cyan,
  dim,
  green,
  red,
  stripAnsi,
  yellow,
} from "../display/terminal.js";
import type { LocusConfig } from "../types.js";

// ─── Help ────────────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stderr.write(`
${bold("locus plan")} — AI-powered sprint planning

${bold("Usage:")}
  locus plan "<directive>"                 ${dim("# AI breaks down into issues")}
  locus plan --from-issues --sprint <name> ${dim("# Organize existing issues")}

${bold("Options:")}
  --sprint <name>     Assign issues to this sprint (creates if needed)
  --from-issues       Organize existing open issues instead of creating new ones
  --dry-run           Show plan without creating issues

${bold("Examples:")}
  locus plan "Build user authentication with OAuth"
  locus plan "Improve API performance" --sprint "Sprint 3"
  locus plan --from-issues --sprint "Sprint 2"

`);
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface PlannedIssue {
  order: number;
  title: string;
  body: string;
  priority: string;
  type: string;
  dependsOn: string;
}

interface ParsedPlanArgs {
  sprintName: string | undefined;
  fromIssues: boolean;
  directive: string;
  dryRun: boolean;
  error: string | undefined;
}

function normalizeSprintName(name: string): string {
  return name.trim().toLowerCase();
}

// ─── Command ─────────────────────────────────────────────────────────────────

export async function planCommand(
  projectRoot: string,
  args: string[],
  flags: { dryRun?: boolean; model?: string } = {}
): Promise<void> {
  // Parse args
  if (args[0] === "help" || args.length === 0) {
    printHelp();
    return;
  }

  const parsedArgs = parsePlanArgs(args);
  if (parsedArgs.error) {
    process.stderr.write(`${red("✗")} ${parsedArgs.error}\n`);
    process.stderr.write(
      `  Usage: ${bold('locus plan "<directive>" --sprint "Sprint 1"')}\n`
    );
    return;
  }

  const config = loadConfig(projectRoot);
  const { sprintName, fromIssues, directive } = parsedArgs;
  flags.dryRun = flags.dryRun || parsedArgs.dryRun;

  if (fromIssues) {
    return handleFromIssues(projectRoot, config, sprintName, flags);
  }

  if (!directive) {
    process.stderr.write(`${red("✗")} Please provide a planning directive.\n`);
    process.stderr.write(
      `  Example: ${bold('locus plan "Build user authentication"')}\n`
    );
    return;
  }

  return handleAIPlan(projectRoot, config, directive, sprintName, flags);
}

// ─── AI-Powered Planning ─────────────────────────────────────────────────────

async function handleAIPlan(
  projectRoot: string,
  config: LocusConfig,
  directive: string,
  sprintName: string | undefined,
  flags: { dryRun?: boolean; model?: string }
): Promise<void> {
  process.stderr.write(`\n${bold("Planning:")} ${cyan(directive)}\n`);
  if (sprintName) {
    process.stderr.write(`  ${dim(`Sprint: ${sprintName}`)}\n`);
  }
  process.stderr.write("\n");

  // Build context for AI
  const context = buildPlanningContext(projectRoot, config, directive);

  // Execute AI to generate the plan (with ESC interrupt support)
  const aiResult = await runAI({
    prompt: context,
    provider: config.ai.provider,
    model: flags.model ?? config.ai.model,
    cwd: projectRoot,
    activity: "sprint planning",
  });

  if (aiResult.interrupted) {
    process.stderr.write(`\n${yellow("⚡")} Planning interrupted.\n`);
    return;
  }

  if (!aiResult.success) {
    process.stderr.write(
      `\n${red("✗")} Planning failed: ${aiResult.error ?? "Unknown error"}\n`
    );
    return;
  }

  const output = sanitizePlanOutput(aiResult.output);

  // Parse the AI output for structured issue data
  const planned = parsePlanOutput(output);

  if (planned.length === 0) {
    process.stderr.write(
      `\n${yellow("⚠")} Could not extract structured issues from plan.\n`
    );
    process.stderr.write(
      `  The AI output is shown above. Create issues manually with ${bold("locus issue create")}.\n`
    );
    return;
  }

  // Display the plan
  process.stderr.write(`\n${bold("Planned Issues:")}\n\n`);
  process.stderr.write(
    `  ${dim("Order")}  ${dim("Title".padEnd(45))}  ${dim("Priority")}   ${dim("Type")}\n`
  );
  for (const issue of planned) {
    process.stderr.write(
      `  ${String(issue.order).padStart(5)}  ${issue.title.padEnd(45).slice(0, 45)}  ${issue.priority.padEnd(10)} ${issue.type}\n`
    );
  }
  process.stderr.write("\n");

  if (flags.dryRun) {
    process.stderr.write(
      `${yellow("⚠")} ${bold("Dry run")} — no issues created.\n\n`
    );
    return;
  }

  // Create the issues on GitHub
  await createPlannedIssues(projectRoot, config, planned, sprintName);
}

// ─── From Existing Issues ────────────────────────────────────────────────────

async function handleFromIssues(
  projectRoot: string,
  config: LocusConfig,
  sprintName: string | undefined,
  flags: { dryRun?: boolean; model?: string }
): Promise<void> {
  if (!sprintName) {
    process.stderr.write(
      `${red("✗")} --from-issues requires --sprint <name>.\n`
    );
    return;
  }

  process.stderr.write(
    `\n${bold("Organizing issues for:")} ${cyan(sprintName)}\n\n`
  );

  // Fetch existing issues in the sprint
  const issues = listIssues(
    { milestone: sprintName, state: "open" },
    { cwd: projectRoot }
  );

  if (issues.length === 0) {
    process.stderr.write(`${dim("No open issues in this sprint.")}\n`);
    return;
  }

  // Build context for AI ordering
  const issueDescriptions = issues
    .map((i) => `#${i.number}: ${i.title}\n${i.body?.slice(0, 300) ?? ""}`)
    .join("\n\n");

  const prompt = `You are organizing GitHub issues for a sprint. Analyze these issues and suggest the optimal execution order.

Issues:
${issueDescriptions}

For each issue, output a line in this format:
ORDER: #<number> <reason for this position>

Order them so that dependencies are respected (issues that produce code needed by later issues should come first).
Start with foundational/setup tasks, then core features, then integration/testing.`;

  const aiResult = await runAI({
    prompt,
    provider: config.ai.provider,
    model: flags.model ?? config.ai.model,
    cwd: projectRoot,
    activity: "issue ordering",
    silent: true,
  });

  if (aiResult.interrupted) {
    process.stderr.write(`\n${yellow("⚡")} Analysis interrupted.\n`);
    return;
  }

  if (!aiResult.success) {
    process.stderr.write(`\n${red("✗")} Analysis failed: ${aiResult.error}\n`);
    return;
  }

  const output = sanitizePlanOutput(aiResult.output);

  // Parse ordering from output
  const orderLines = output
    .split("\n")
    .filter((l) => l.match(/ORDER:\s*#?\d+/i));

  if (orderLines.length === 0) {
    process.stderr.write(
      `${yellow("⚠")} Could not parse ordering from AI output.\n`
    );
    process.stderr.write(`AI output:\n${output.slice(0, 500)}\n`);
    return;
  }

  process.stderr.write(`\n${bold("Suggested Order:")}\n\n`);

  let order = 1;
  for (const line of orderLines) {
    const match = line.match(/#(\d+)/);
    if (!match) continue;

    const num = Number.parseInt(match[1], 10);
    const issue = issues.find((i) => i.number === num);
    if (!issue) continue;

    process.stderr.write(
      `  ${String(order).padStart(3)}. #${num}  ${issue.title}\n`
    );

    if (!flags.dryRun) {
      // Ensure order label exists and assign it
      ensureOrderLabel(order, { cwd: projectRoot });

      // Remove any existing order labels
      const existingOrder = issue.labels.filter((l) => l.startsWith("order:"));
      if (existingOrder.length > 0) {
        updateIssueLabels(num, [], existingOrder, { cwd: projectRoot });
      }

      // Add new order label
      updateIssueLabels(num, [`order:${order}`], [], { cwd: projectRoot });
    }

    order++;
  }

  process.stderr.write("\n");
  if (flags.dryRun) {
    process.stderr.write(
      `${yellow("⚠")} ${bold("Dry run")} — no labels updated.\n\n`
    );
  } else {
    process.stderr.write(
      `${green("✓")} Updated order labels for ${order - 1} issues.\n\n`
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPlanningContext(
  projectRoot: string,
  config: LocusConfig,
  directive: string
): string {
  const parts: string[] = [];

  parts.push(
    `You are a sprint planning assistant for the GitHub repository ${config.github.owner}/${config.github.repo}.`
  );
  parts.push("");
  parts.push(`DIRECTIVE: ${directive}`);
  parts.push("");

  // Include LOCUS.md if it exists
  const locusPath = join(projectRoot, "LOCUS.md");
  if (existsSync(locusPath)) {
    const content = readFileSync(locusPath, "utf-8");
    parts.push("PROJECT CONTEXT (LOCUS.md):");
    parts.push(content.slice(0, 3000));
    parts.push("");
  }

  // Include LEARNINGS.md if it exists
  const learningsPath = join(projectRoot, ".locus", "LEARNINGS.md");
  if (existsSync(learningsPath)) {
    const content = readFileSync(learningsPath, "utf-8");
    parts.push("PAST LEARNINGS:");
    parts.push(content.slice(0, 2000));
    parts.push("");
  }

  parts.push("INSTRUCTIONS:");
  parts.push(
    "Break down the directive into specific, actionable GitHub issues."
  );
  parts.push("Each issue should be independently executable by an AI agent.");
  parts.push(
    "Order them so dependencies are respected (foundational tasks first)."
  );
  parts.push("");
  parts.push("For EACH issue, output EXACTLY this format (one per issue):");
  parts.push("");
  parts.push("---ISSUE---");
  parts.push("ORDER: <number>");
  parts.push("TITLE: <concise issue title>");
  parts.push("PRIORITY: <critical|high|medium|low>");
  parts.push("TYPE: <feature|bug|chore|refactor|docs>");
  parts.push("DEPENDS_ON: <comma-separated previous order numbers, or 'none'>");
  parts.push("BODY:");
  parts.push("<detailed issue description with acceptance criteria>");
  parts.push("---END---");
  parts.push("");
  parts.push("Be specific in issue bodies. Include:");
  parts.push("- What code/files should be created or modified");
  parts.push("- Acceptance criteria (testable conditions)");
  parts.push("- What previous tasks produce that this task needs");
  parts.push("- Use valid GitHub Markdown only (no ANSI color/control codes)");

  return parts.join("\n");
}

export function sanitizePlanOutput(output: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI/OSC cleanup requires matching control bytes
  const ansiOscPattern = /\x1B\][^\x07]*(?:\x07|\x1B\\)/g;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI CSI cleanup requires matching control bytes
  const ansiCsiPattern = /[\x1B\x9B][0-?]*[ -/]*[@-~]/g;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: sanitize non-printable control bytes from runner output
  const controlCharsPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

  return stripAnsi(output)
    .replace(ansiOscPattern, "")
    .replace(ansiCsiPattern, "")
    .replace(/\uFFFD\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(controlCharsPattern, "")
    .replace(/\r\n?/g, "\n");
}

export function parsePlanArgs(args: string[]): ParsedPlanArgs {
  let sprintName: string | undefined;
  let fromIssues = false;
  let dryRun = false;
  const directiveParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--sprint") {
      const next = args[i + 1];
      if (!next || next.startsWith("--")) {
        return {
          sprintName: undefined,
          fromIssues: false,
          directive: "",
          dryRun: false,
          error:
            '--sprint requires a sprint name (for example: --sprint "Sprint 1").',
        };
      }
      sprintName = next;
      i++;
      continue;
    }

    if (arg === "--from-issues") {
      fromIssues = true;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    directiveParts.push(arg);
  }

  return {
    sprintName,
    fromIssues,
    directive: directiveParts.join(" ").trim(),
    dryRun,
    error: undefined,
  };
}

export function parsePlanOutput(output: string): PlannedIssue[] {
  const issues: PlannedIssue[] = [];
  const cleanedOutput = sanitizePlanOutput(output);
  const blocks = cleanedOutput.split("---ISSUE---").slice(1);

  for (const block of blocks) {
    const endIdx = block.indexOf("---END---");
    const content = endIdx >= 0 ? block.slice(0, endIdx) : block;

    const orderMatch = content.match(/ORDER:\s*(\d+)/i);
    const titleMatch = content.match(/TITLE:\s*(.+)/i);
    const priorityMatch = content.match(/PRIORITY:\s*(\w+)/i);
    const typeMatch = content.match(/TYPE:\s*(\w+)/i);
    const dependsMatch = content.match(/DEPENDS_ON:\s*(.+)/i);
    const bodyMatch = content.match(/BODY:\s*([\s\S]*?)$/i);

    if (!titleMatch) continue;

    issues.push({
      order: orderMatch
        ? Number.parseInt(orderMatch[1], 10)
        : issues.length + 1,
      title: titleMatch[1].trim(),
      body: bodyMatch ? bodyMatch[1].trim() : "",
      priority: priorityMatch ? priorityMatch[1].toLowerCase() : "medium",
      type: typeMatch ? typeMatch[1].toLowerCase() : "feature",
      dependsOn: dependsMatch ? dependsMatch[1].trim() : "none",
    });
  }

  return issues.sort((a, b) => a.order - b.order);
}

async function createPlannedIssues(
  projectRoot: string,
  config: LocusConfig,
  planned: PlannedIssue[],
  sprintName: string | undefined
): Promise<void> {
  let milestoneTitle = sprintName;

  // Ensure sprint milestone exists if specified
  if (milestoneTitle) {
    const desiredTitle = milestoneTitle;
    const milestones = listMilestones(
      config.github.owner,
      config.github.repo,
      "all",
      { cwd: projectRoot }
    );
    const matched = milestones.find(
      (m) => normalizeSprintName(m.title) === normalizeSprintName(desiredTitle)
    );
    if (!matched) {
      createMilestone(
        config.github.owner,
        config.github.repo,
        milestoneTitle,
        undefined,
        undefined,
        {
          cwd: projectRoot,
        }
      );
      process.stderr.write(
        `${green("✓")} Created sprint: ${cyan(milestoneTitle)}\n`
      );
    } else {
      milestoneTitle = matched.title;
      if (matched.state === "closed") {
        reopenMilestone(
          config.github.owner,
          config.github.repo,
          matched.number,
          {
            cwd: projectRoot,
          }
        );
        process.stderr.write(
          `${green("✓")} Reopened sprint: ${cyan(milestoneTitle)}\n`
        );
      }
    }
  }

  process.stderr.write(`\n${bold("Creating issues...")}\n\n`);

  for (const issue of planned) {
    const labels = [
      `p:${issue.priority}`,
      `type:${issue.type}`,
      "locus:queued",
      "agent:managed",
    ];

    try {
      // Ensure order label exists
      ensureOrderLabel(issue.order, { cwd: projectRoot });

      // Create the issue
      const issueNumber = createIssue(
        issue.title,
        issue.body,
        labels,
        milestoneTitle,
        { cwd: projectRoot }
      );

      // Add order label
      updateIssueLabels(issueNumber, [`order:${issue.order}`], [], {
        cwd: projectRoot,
      });

      process.stderr.write(
        `  ${green("✓")} #${issueNumber}  ${issue.title}  ${dim(`order:${issue.order}`)}\n`
      );
    } catch (e) {
      process.stderr.write(`  ${red("✗")} Failed: ${issue.title} — ${e}\n`);
    }
  }

  process.stderr.write(
    `\n${green("✓")} Created ${planned.length} issues.${milestoneTitle ? ` Sprint: ${cyan(milestoneTitle)}` : ""}\n\n`
  );
}
