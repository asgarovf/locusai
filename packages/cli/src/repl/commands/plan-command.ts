import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  c,
  createAiRunner,
  getLocusPath,
  LocusClient,
  PlanManager,
  PlanningMeeting,
} from "@locusai/sdk/node";
import { SettingsManager } from "../../settings-manager";
import { WorkspaceResolver } from "../../workspace-resolver";
import type { REPLSession, SlashCommand } from "../slash-commands";

export const planCommand: SlashCommand = {
  name: "plan",
  aliases: ["p"],
  description: "Start or manage sprint plans",
  usage: "/plan <directive> | --list | --show <id> | --approve <id> | --reject <id> <feedback> | --cancel <id>",
  category: "ai",
  execute: async (session: REPLSession, args?: string) => {
    const trimmed = (args ?? "").trim();

    // /plan --list
    if (trimmed === "--list") {
      return listPlans(session);
    }

    // /plan --show <id>
    if (trimmed.startsWith("--show")) {
      const id = normalizePlanId(trimmed.replace("--show", "").trim());
      if (!id) {
        console.log(
          `\n  ${c.error("Usage:")} ${c.cyan("/plan --show <plan-id>")}\n`
        );
        return;
      }
      return showPlan(session, id);
    }

    // /plan --approve <id>
    if (trimmed.startsWith("--approve")) {
      const id = normalizePlanId(trimmed.replace("--approve", "").trim());
      if (!id) {
        console.log(
          `\n  ${c.error("Usage:")} ${c.cyan("/plan --approve <plan-id>")}\n`
        );
        return;
      }
      return approvePlan(session, id);
    }

    // /plan --reject <id> <feedback>
    if (trimmed.startsWith("--reject")) {
      const rest = trimmed.replace("--reject", "").trim();
      const { id, remainder } = extractPlanIdAndRemainder(rest);
      if (!id) {
        console.log(
          `\n  ${c.error("Usage:")} ${c.cyan('/plan --reject <plan-id> "feedback"')}\n`
        );
        return;
      }
      if (!remainder) {
        console.log(
          `\n  ${c.error("✖")} ${c.red("Feedback is required when rejecting a plan")}\n`
        );
        console.log(
          `  ${c.dim("Usage:")} ${c.cyan('/plan --reject <plan-id> "your feedback"')}\n`
        );
        return;
      }
      return rejectPlan(session, id, remainder);
    }

    // /plan --cancel <id>
    if (trimmed.startsWith("--cancel")) {
      const id = normalizePlanId(trimmed.replace("--cancel", "").trim());
      if (!id) {
        console.log(
          `\n  ${c.error("Usage:")} ${c.cyan("/plan --cancel <plan-id>")}\n`
        );
        return;
      }
      return cancelPlan(session, id);
    }

    // /plan (no args) — show help
    if (!trimmed) {
      showPlanHelp();
      return;
    }

    // /plan <directive> — start a planning meeting
    await startPlanningMeeting(session, trimmed);
  },
};

// ── Plan ID normalization ─────────────────────────────────────

/**
 * Normalize a plan ID string.
 * Handles the case where "plan -1234" was split by the shell into "plan" + "-1234".
 * Merges tokens like "plan -1234" into "plan-1234".
 */
function normalizePlanId(raw: string): string {
  const parts = raw.split(/\s+/);
  if (
    parts.length === 2 &&
    parts[0] === "plan" &&
    /^-\d+$/.test(parts[1])
  ) {
    return `plan${parts[1]}`;
  }
  return raw;
}

/**
 * Extract a plan ID and any remaining text from a raw argument string.
 * Handles the "plan -1234 some feedback" pattern.
 */
function extractPlanIdAndRemainder(raw: string): {
  id: string;
  remainder: string;
} {
  const parts = raw.split(/\s+/);

  // Pattern: "plan -1234 feedback..."
  if (
    parts.length >= 2 &&
    parts[0] === "plan" &&
    /^-\d+$/.test(parts[1])
  ) {
    const id = `plan${parts[1]}`;
    const remainder = parts.slice(2).join(" ").trim();
    return { id, remainder };
  }

  // Pattern: "plan-1234 feedback..."
  if (parts.length >= 1 && parts[0]) {
    const id = parts[0];
    const remainder = parts.slice(1).join(" ").trim();
    return { id, remainder };
  }

  return { id: "", remainder: "" };
}

// ── Sub-commands ──────────────────────────────────────────────

async function startPlanningMeeting(
  session: REPLSession,
  directive: string
): Promise<void> {
  const projectPath = session.getProjectPath();
  const provider = session.getProvider();
  const model = session.getModel();

  const planManager = new PlanManager(projectPath);
  const aiRunner = createAiRunner(provider, { projectPath, model });

  const log = (
    message: string,
    level?: "info" | "success" | "warn" | "error"
  ) => {
    const icon =
      level === "success"
        ? c.success("✔")
        : level === "error"
          ? c.error("✖")
          : level === "warn"
            ? c.warning("!")
            : c.info("●");
    console.log(`  ${icon} ${message}`);
  };

  console.log(
    `\n  ${c.header(" PLANNING MEETING ")} ${c.bold("Starting async planning meeting...")}\n`
  );
  console.log(`  ${c.dim("Directive:")} ${c.bold(directive)}`);
  console.log(`  ${c.dim("Model:")} ${c.dim(`${model} (${provider})`)}\n`);

  // Check for re-planning with rejected feedback
  const rejectedPlans = planManager.list("rejected");
  let feedback: string | undefined;
  const latestRejected = rejectedPlans.find(
    (p) => p.directive === directive && p.feedback
  );
  if (latestRejected) {
    feedback = latestRejected.feedback;
    console.log(
      `  ${c.info("ℹ")} ${c.dim("Re-planning with feedback:")} ${feedback}\n`
    );
  }

  const meeting = new PlanningMeeting({
    projectPath,
    aiRunner,
    log,
  });

  try {
    const result = await meeting.run(directive, feedback);

    // Save the plan
    planManager.save(result.plan);

    // Clean up temp file if it exists
    const tempFile = join(
      getLocusPath(projectPath, "plansDir"),
      `${result.plan.id}.json`
    );
    if (existsSync(tempFile)) {
      unlinkSync(tempFile);
    }

    console.log(
      `\n  ${c.success("✔")} ${c.success("Planning meeting complete!")}\n`
    );
    console.log(
      `  ${c.dim("Plan saved as:")} ${c.primary(result.plan.name)} ${c.dim(`(${result.plan.id})`)}\n`
    );

    // Display summary
    printPlanSummary(result.plan);

    console.log(
      `  ${c.dim("To review:")} ${c.cyan(`/plan --show ${result.plan.id}`)}`
    );
    console.log(
      `  ${c.dim("To approve:")} ${c.cyan(`/plan --approve ${result.plan.id}`)}`
    );
    console.log(
      `  ${c.dim("To reject:")} ${c.cyan(`/plan --reject ${result.plan.id} "feedback"`)}`
    );
    console.log(
      `  ${c.dim("To cancel:")} ${c.cyan(`/plan --cancel ${result.plan.id}`)}\n`
    );
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red("Planning meeting failed:")} ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }
}

function listPlans(session: REPLSession): void {
  const projectPath = session.getProjectPath();
  const planManager = new PlanManager(projectPath);
  const plans = planManager.list();

  if (plans.length === 0) {
    console.log(`\n  ${c.dim("No plans found.")}`);
    console.log(
      `  ${c.dim("Create one with:")} ${c.cyan('/plan "build user auth"')}\n`
    );
    return;
  }

  console.log(
    `\n  ${c.header(" SPRINT PLANS ")} ${c.dim(`(${plans.length})`)}\n`
  );

  for (const plan of plans) {
    const statusIcon =
      plan.status === "pending"
        ? c.warning("◯")
        : plan.status === "approved"
          ? c.success("✔")
          : plan.status === "rejected"
            ? c.error("✖")
            : c.dim("⊘");

    console.log(
      `  ${statusIcon} ${c.bold(plan.name)} ${c.dim(
        `[${plan.status}]`
      )} ${c.dim(`— ${plan.tasks.length} tasks`)}`
    );
    console.log(`    ${c.dim("ID:")} ${plan.id}`);
    console.log(`    ${c.dim("Created:")} ${plan.createdAt}`);
    if (plan.feedback) {
      console.log(`    ${c.dim("Feedback:")} ${plan.feedback}`);
    }
    console.log("");
  }
}

function showPlan(session: REPLSession, idOrSlug: string): void {
  const projectPath = session.getProjectPath();
  const planManager = new PlanManager(projectPath);
  const md = planManager.getMarkdown(idOrSlug);

  if (!md) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(`Plan not found: ${idOrSlug}`)}\n`
    );
    return;
  }

  console.log(`\n${md}\n`);
}

async function approvePlan(
  session: REPLSession,
  idOrSlug: string
): Promise<void> {
  const projectPath = session.getProjectPath();
  const planManager = new PlanManager(projectPath);

  // Resolve API context from settings
  const settingsManager = new SettingsManager(projectPath);
  const settings = settingsManager.load();

  const apiKey = settings.apiKey;
  if (!apiKey) {
    console.error(
      `\n  ${c.error("✖")} ${c.red("API key is required for this operation")}\n`
    );
    console.error(
      `  ${c.dim("Configure with:")} ${c.cyan("locus config setup --api-key <key>")}\n`
    );
    return;
  }

  const apiBase = settings.apiUrl || "https://api.locusai.dev/api";

  const resolver = new WorkspaceResolver({
    apiKey,
    apiBase,
    workspaceId: settings.workspaceId,
  });

  let workspaceId: string;
  try {
    workspaceId = await resolver.resolve();
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        error instanceof Error ? error.message : String(error)
      )}\n`
    );
    return;
  }

  const client = new LocusClient({
    baseUrl: apiBase,
    token: apiKey,
  });

  try {
    console.log(
      `\n  ${c.info("●")} ${c.bold("Approving plan and creating sprint...")}\n`
    );

    const { sprint, tasks } = await planManager.approve(
      idOrSlug,
      client,
      workspaceId
    );

    console.log(
      `  ${c.success("✔")} ${c.success("Sprint created:")} ${sprint.name}`
    );
    console.log(`  ${c.dim("Sprint ID:")} ${sprint.id}`);
    console.log(`  ${c.dim("Tasks created:")} ${tasks.length}\n`);

    for (const task of tasks) {
      console.log(
        `    ${c.dim("•")} ${task.title} ${c.dim(
          `[${task.assigneeRole || "UNASSIGNED"}]`
        )}`
      );
    }

    console.log(
      `\n  ${c.dim("Start agents with:")} ${c.cyan("locus run")}\n`
    );
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        error instanceof Error ? error.message : String(error)
      )}\n`
    );
  }
}

function rejectPlan(
  session: REPLSession,
  idOrSlug: string,
  feedback: string
): void {
  const projectPath = session.getProjectPath();
  const planManager = new PlanManager(projectPath);

  try {
    const plan = planManager.reject(idOrSlug, feedback);
    console.log(
      `\n  ${c.warning("!")} ${c.bold("Plan rejected:")} ${plan.name}\n`
    );
    console.log(`  ${c.dim("Feedback saved:")} ${feedback}\n`);
    console.log(
      `  ${c.dim("Re-run the planning meeting with the same directive to incorporate feedback:")}`
    );
    console.log(`  ${c.cyan(`/plan "${plan.directive}"`)}\n`);
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        error instanceof Error ? error.message : String(error)
      )}\n`
    );
  }
}

function cancelPlan(session: REPLSession, idOrSlug: string): void {
  const projectPath = session.getProjectPath();
  const planManager = new PlanManager(projectPath);

  try {
    planManager.cancel(idOrSlug);
    console.log(`\n  ${c.success("✔")} ${c.dim("Plan cancelled.")}\n`);
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        error instanceof Error ? error.message : String(error)
      )}\n`
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────

function printPlanSummary(plan: {
  name: string;
  goal: string;
  tasks: { title: string; assigneeRole: string; complexity: number }[];
  estimatedDays: number;
  risks: { description: string; severity: string }[];
}): void {
  console.log(`  ${c.bold("Sprint:")} ${plan.name}`);
  console.log(`  ${c.bold("Goal:")} ${plan.goal}`);
  console.log(`  ${c.bold("Tasks:")} ${plan.tasks.length}`);
  console.log(`  ${c.bold("Estimated:")} ${plan.estimatedDays} day(s)\n`);

  for (const task of plan.tasks) {
    const bar = "█".repeat(task.complexity) + "░".repeat(5 - task.complexity);
    console.log(
      `    ${c.dim("•")} ${task.title} ${c.dim(
        `[${task.assigneeRole}]`
      )} ${c.dim(bar)}`
    );
  }

  if (plan.risks.length > 0) {
    console.log(`\n  ${c.bold("Risks:")}`);
    for (const risk of plan.risks) {
      const icon =
        risk.severity === "high"
          ? c.error("▲")
          : risk.severity === "medium"
            ? c.warning("▲")
            : c.dim("▲");
      console.log(`    ${icon} ${risk.description}`);
    }
  }

  console.log("");
}

function showPlanHelp(): void {
  console.log(`
  ${c.header(" PLAN ")} ${c.dim("— Sprint Planning Meeting")}

    ${c.cyan('/plan "directive"')}           Start a planning meeting
    ${c.cyan("/plan --list")}                List all plans
    ${c.cyan("/plan --show <id>")}           Show plan details
    ${c.cyan("/plan --approve <id>")}        Approve plan (creates sprint + tasks)
    ${c.cyan('/plan --reject <id> "..."')}   Reject plan with feedback
    ${c.cyan("/plan --cancel <id>")}         Cancel a plan

  ${c.dim("Planning runs in the foreground — agent logs are shown in real-time.")}
  ${c.dim("Slash commands still work as usual.")}
`);
}
