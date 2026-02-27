/**
 * `locus plan` — AI-powered sprint planning.
 *
 * Usage:
 *   locus plan "Build a user auth system"          # AI creates plan file in .locus/plans/
 *   locus plan approve <id>                         # Create GitHub issues from a saved plan
 *   locus plan list                                 # List saved plans
 *   locus plan show <id>                            # Show a saved plan
 *   locus plan --from-issues --sprint "Sprint 2"   # Organize existing issues
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
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
  locus plan "<directive>"                 ${dim("# AI creates a plan file")}
  locus plan approve <id> [--sprint <name>] ${dim("# Create GitHub issues from saved plan")}
  locus plan list                          ${dim("# List saved plans")}
  locus plan show <id>                     ${dim("# Show a saved plan")}
  locus plan --from-issues --sprint <name> ${dim("# Organize existing issues")}

${bold("Options:")}
  --sprint <name>     Assign issues to this sprint (creates if needed)
  --from-issues       Organize existing open issues instead of creating new ones
  --dry-run           Show plan without creating issues

${bold("Examples:")}
  locus plan "Build user authentication with OAuth"
  locus plan "Improve API performance" --sprint "Sprint 3"
  locus plan approve abc123
  locus plan approve abc123 --sprint "Sprint 3"
  locus plan list
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

interface PlanFile {
  id: string;
  directive: string;
  sprint: string | null;
  createdAt: string;
  issues: PlannedIssue[];
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

// ─── Plans Directory ─────────────────────────────────────────────────────────

function getPlansDir(projectRoot: string): string {
  return join(projectRoot, ".locus", "plans");
}

function ensurePlansDir(projectRoot: string): string {
  const dir = getPlansDir(projectRoot);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function generateId(): string {
  return `${Math.random().toString(36).slice(2, 8)}`;
}

function loadPlanFile(projectRoot: string, id: string): PlanFile | null {
  const dir = getPlansDir(projectRoot);
  if (!existsSync(dir)) return null;

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const match = files.find((f) => f.startsWith(id));
  if (!match) return null;

  try {
    const content = readFileSync(join(dir, match), "utf-8");
    return JSON.parse(content) as PlanFile;
  } catch {
    return null;
  }
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

  // Subcommands
  if (args[0] === "list") {
    return handleListPlans(projectRoot);
  }

  if (args[0] === "show") {
    return handleShowPlan(projectRoot, args[1]);
  }

  if (args[0] === "approve") {
    const approveArgs = parsePlanArgs(args.slice(2));
    return handleApprovePlan(
      projectRoot,
      args[1],
      { ...flags, dryRun: flags.dryRun || approveArgs.dryRun },
      approveArgs.sprintName
    );
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

// ─── List Plans ──────────────────────────────────────────────────────────────

function handleListPlans(projectRoot: string): void {
  const dir = getPlansDir(projectRoot);

  if (!existsSync(dir)) {
    process.stderr.write(`${dim("No saved plans yet.")}\n`);
    return;
  }

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    process.stderr.write(`${dim("No saved plans yet.")}\n`);
    return;
  }

  process.stderr.write(`\n${bold("Saved Plans:")}\n\n`);

  for (const file of files) {
    const id = file.replace(".json", "");
    try {
      const content = readFileSync(join(dir, file), "utf-8");
      const plan = JSON.parse(content) as PlanFile;
      const date = plan.createdAt ? plan.createdAt.slice(0, 10) : "";
      const issueCount = Array.isArray(plan.issues) ? plan.issues.length : 0;
      process.stderr.write(
        `  ${cyan(id.slice(0, 12))}  ${plan.directive.slice(0, 55)}  ${dim(`${issueCount} issues`)}  ${dim(date)}\n`
      );
    } catch {
      process.stderr.write(
        `  ${cyan(id.slice(0, 12))}  ${dim("(unreadable)")}\n`
      );
    }
  }

  process.stderr.write("\n");
  process.stderr.write(
    `  Approve a plan: ${bold("locus plan approve <id> --sprint <name>")}\n\n`
  );
}

// ─── Show Plan ────────────────────────────────────────────────────────────────

function handleShowPlan(projectRoot: string, id: string | undefined): void {
  if (!id) {
    process.stderr.write(`${red("✗")} Please provide a plan ID.\n`);
    process.stderr.write(`  Usage: ${bold("locus plan show <id>")}\n`);
    return;
  }

  const plan = loadPlanFile(projectRoot, id);
  if (!plan) {
    process.stderr.write(`${red("✗")} Plan "${id}" not found.\n`);
    process.stderr.write(`  List plans with: ${bold("locus plan list")}\n`);
    return;
  }

  process.stderr.write(`\n${bold("Plan:")} ${cyan(plan.directive)}\n`);
  process.stderr.write(`  ${dim(`ID: ${plan.id}`)}\n`);
  if (plan.sprint) {
    process.stderr.write(`  ${dim(`Sprint: ${plan.sprint}`)}\n`);
  }
  process.stderr.write(`  ${dim(`Created: ${plan.createdAt.slice(0, 10)}`)}\n`);
  process.stderr.write("\n");
  process.stderr.write(
    `  ${dim("Order")}  ${dim("Title".padEnd(50))}  ${dim("Priority")}   ${dim("Type")}\n`
  );

  for (const issue of plan.issues) {
    process.stderr.write(
      `  ${String(issue.order).padStart(5)}  ${issue.title.padEnd(50).slice(0, 50)}  ${issue.priority.padEnd(10)} ${issue.type}\n`
    );
  }

  process.stderr.write("\n");
  process.stderr.write(
    `  Approve: ${bold(`locus plan approve ${plan.id.slice(0, 8)}`)}  ${dim("(--sprint <name> to assign to a sprint)")}\n\n`
  );
}

// ─── Approve Plan ─────────────────────────────────────────────────────────────

async function handleApprovePlan(
  projectRoot: string,
  id: string | undefined,
  flags: { dryRun?: boolean },
  sprintOverride?: string
): Promise<void> {
  if (!id) {
    process.stderr.write(`${red("✗")} Please provide a plan ID.\n`);
    process.stderr.write(`  Usage: ${bold("locus plan approve <id>")}\n`);
    process.stderr.write(`  List plans with: ${bold("locus plan list")}\n`);
    return;
  }

  const plan = loadPlanFile(projectRoot, id);
  if (!plan) {
    process.stderr.write(`${red("✗")} Plan "${id}" not found.\n`);
    process.stderr.write(`  List plans with: ${bold("locus plan list")}\n`);
    return;
  }

  if (!Array.isArray(plan.issues) || plan.issues.length === 0) {
    process.stderr.write(`${red("✗")} Plan "${id}" has no issues.\n`);
    return;
  }

  const config = loadConfig(projectRoot);
  const sprintName = sprintOverride ?? plan.sprint ?? undefined;

  process.stderr.write(`\n${bold("Approving plan:")}\n`);
  if (sprintName) {
    process.stderr.write(`  ${dim(`Sprint: ${sprintName}`)}\n`);
  }
  process.stderr.write("\n");

  // Display issue summary
  process.stderr.write(
    `  ${dim("Order")}  ${dim("Title".padEnd(50))}  ${dim("Priority")}   ${dim("Type")}\n`
  );
  for (const issue of plan.issues) {
    process.stderr.write(
      `  ${String(issue.order).padStart(5)}  ${issue.title.padEnd(50).slice(0, 50)}  ${issue.priority.padEnd(10)} ${issue.type}\n`
    );
  }
  process.stderr.write("\n");

  if (flags.dryRun) {
    process.stderr.write(
      `${yellow("⚠")} ${bold("Dry run")} — no issues created.\n\n`
    );
    return;
  }

  await createPlannedIssues(projectRoot, config, plan.issues, sprintName);
}

// ─── AI-Powered Planning ─────────────────────────────────────────────────────

async function handleAIPlan(
  projectRoot: string,
  config: LocusConfig,
  directive: string,
  sprintName: string | undefined,
  flags: { dryRun?: boolean; model?: string }
): Promise<void> {
  const id = generateId();
  const plansDir = ensurePlansDir(projectRoot);
  const planPath = join(plansDir, `${id}.json`);
  const planPathRelative = `.locus/plans/${id}.json`;

  // Show only the first line of directive (may contain embedded content on subsequent lines)
  const displayDirective = directive;
  process.stderr.write(`\n${bold("Planning:")} ${cyan(displayDirective)}\n`);
  if (sprintName) {
    process.stderr.write(`  ${dim(`Sprint: ${sprintName}`)}\n`);
  }
  process.stderr.write("\n");

  const prompt = buildPlanningPrompt(
    projectRoot,
    config,
    directive,
    sprintName,
    id,
    planPathRelative
  );

  const aiResult = await runAI({
    prompt,
    provider: config.ai.provider,
    model: flags.model ?? config.ai.model,
    cwd: projectRoot,
    activity: "planning",
  });

  if (aiResult.interrupted) {
    process.stderr.write(`\n${yellow("⚡")} Planning interrupted.\n`);
    return;
  }

  if (!aiResult.success) {
    process.stderr.write(`\n${red("✗")} Planning failed: ${aiResult.error}\n`);
    return;
  }

  // Check if the plan file was created by the AI agent
  if (!existsSync(planPath)) {
    process.stderr.write(
      `\n${yellow("⚠")} Plan file was not created at ${bold(planPathRelative)}.\n`
    );
    process.stderr.write(
      `  Try again or create issues manually with ${bold("locus issue create")}.\n`
    );
    return;
  }

  // Parse and validate the plan file
  let plan: PlanFile;
  try {
    const content = readFileSync(planPath, "utf-8");
    plan = JSON.parse(content) as PlanFile;
  } catch {
    process.stderr.write(
      `\n${red("✗")} Plan file at ${bold(planPathRelative)} is not valid JSON.\n`
    );
    return;
  }

  if (!Array.isArray(plan.issues) || plan.issues.length === 0) {
    process.stderr.write(`\n${yellow("⚠")} Plan file has no issues.\n`);
    return;
  }

  // Ensure metadata fields are set
  if (!plan.id) plan.id = id;
  if (!plan.directive) plan.directive = directive;
  if (!plan.sprint && sprintName) plan.sprint = sprintName;
  if (!plan.createdAt) plan.createdAt = new Date().toISOString();
  writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf-8");

  // Show summary
  process.stderr.write(`\n${bold("Plan saved:")} ${cyan(id)}\n\n`);
  process.stderr.write(
    `  ${dim("Order")}  ${dim("Title".padEnd(50))}  ${dim("Priority")}   ${dim("Type")}\n`
  );
  for (const issue of plan.issues) {
    process.stderr.write(
      `  ${String(issue.order).padStart(5)}  ${issue.title.padEnd(50).slice(0, 50)}  ${(issue.priority ?? "medium").padEnd(10)} ${issue.type ?? "feature"}\n`
    );
  }
  process.stderr.write("\n");

  if (flags.dryRun) {
    process.stderr.write(
      `${yellow("⚠")} ${bold("Dry run")} — no issues created.\n`
    );
    process.stderr.write(
      `  Approve later with: ${bold(`locus plan approve ${id.slice(0, 8)}`)}\n\n`
    );
    return;
  }

  process.stderr.write(
    `  To create these issues: ${bold(`locus plan approve ${id.slice(0, 8)} --sprint <sprint name>`)}\n\n`
  );
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

  const { runAI } = await import("../ai/run-ai.js");
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

function buildPlanningPrompt(
  projectRoot: string,
  config: LocusConfig,
  directive: string,
  sprintName: string | undefined,
  id: string,
  planPathRelative: string
): string {
  const parts: string[] = [];

  parts.push(
    `You are a sprint planning assistant for the GitHub repository ${config.github.owner}/${config.github.repo}.`
  );
  parts.push("");
  parts.push(`DIRECTIVE: ${directive}`);
  if (sprintName) {
    parts.push(`SPRINT: ${sprintName}`);
  }
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

  parts.push("TASK:");
  parts.push(
    `Break down the directive into specific, actionable GitHub issues and write them to the file: ${planPathRelative}`
  );
  parts.push("");
  parts.push(
    `Write ONLY a valid JSON file to ${planPathRelative} with this exact structure:`
  );
  parts.push("");
  parts.push("```json");
  parts.push("{");
  parts.push(`  "id": "${id}",`);
  parts.push(`  "directive": ${JSON.stringify(directive)},`);
  parts.push(
    `  "sprint": ${sprintName ? JSON.stringify(sprintName) : "null"},`
  );
  parts.push(`  "createdAt": "${new Date().toISOString()}",`);
  parts.push('  "issues": [');
  parts.push("    {");
  parts.push('      "order": 1,');
  parts.push('      "title": "concise issue title",');
  parts.push(
    '      "body": "detailed markdown body with acceptance criteria",'
  );
  parts.push('      "priority": "critical|high|medium|low",');
  parts.push('      "type": "feature|bug|chore|refactor|docs",');
  parts.push('      "dependsOn": "none or comma-separated order numbers"');
  parts.push("    }");
  parts.push("  ]");
  parts.push("}");
  parts.push("```");
  parts.push("");
  parts.push("Requirements for the issues:");
  parts.push("- Break the directive into 3-10 specific, actionable issues");
  parts.push("- Each issue must be independently executable by an AI agent");
  parts.push(
    "- Order them so dependencies are respected (foundational tasks first)"
  );
  parts.push("- Write detailed issue bodies with clear acceptance criteria");
  parts.push("- Use valid GitHub Markdown only in issue bodies");
  parts.push(
    "- Create the file using the Write tool — do not print the JSON to the terminal"
  );

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
