import { parseArgs } from "node:util";
import {
  c,
  createAiRunner,
  DEFAULT_MODEL,
  LocusClient,
  PlanManager,
  PlanningMeeting,
} from "@locusai/sdk/node";
import { ConfigManager } from "../config-manager";
import { SettingsManager } from "../settings-manager";
import { requireInitialization, resolveProvider, VERSION } from "../utils";
import { WorkspaceResolver } from "../workspace-resolver";

/**
 * Normalise plan-ID arguments so `--approve plan -1771009897498` is
 * treated the same as `--approve plan-1771009897498`.
 *
 * Node's `parseArgs` splits `plan -<digits>` into separate tokens,
 * breaking the ID. This pre-processes the args array to merge them.
 */
function normalizePlanIdArgs(args: string[]): string[] {
  const planIdFlags = new Set([
    "--approve",
    "--reject",
    "--cancel",
    "--show",
  ]);

  const result: string[] = [];
  let i = 0;

  while (i < args.length) {
    if (
      planIdFlags.has(args[i]) &&
      i + 2 < args.length &&
      args[i + 1] === "plan" &&
      /^-\d+$/.test(args[i + 2])
    ) {
      // Merge: --approve plan -1234 → --approve plan-1234
      result.push(args[i]);
      result.push(`plan${args[i + 2]}`);
      i += 3;
    } else {
      result.push(args[i]);
      i++;
    }
  }

  return result;
}

export async function planCommand(args: string[]): Promise<void> {
  const normalizedArgs = normalizePlanIdArgs(args);
  const { values, positionals } = parseArgs({
    args: normalizedArgs,
    options: {
      approve: { type: "string" },
      reject: { type: "string" },
      cancel: { type: "string" },
      feedback: { type: "string" },
      list: { type: "boolean" },
      show: { type: "string" },
      model: { type: "string" },
      provider: { type: "string" },
      "api-key": { type: "string" },
      "api-url": { type: "string" },
      workspace: { type: "string" },
      dir: { type: "string" },
    },
    strict: false,
    allowPositionals: true,
  });

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "plan");

  const planManager = new PlanManager(projectPath);

  // ── List plans ──────────────────────────────────────────────
  if (values.list) {
    return listPlans(planManager);
  }

  // ── Show plan details ───────────────────────────────────────
  if (values.show) {
    return showPlan(planManager, values.show as string);
  }

  // ── Cancel plan ─────────────────────────────────────────────
  if (values.cancel) {
    return cancelPlan(planManager, values.cancel as string);
  }

  // ── Reject plan ─────────────────────────────────────────────
  if (values.reject) {
    const feedback = values.feedback as string;
    if (!feedback) {
      console.error(
        `\n  ${c.error("✖")} ${c.red(
          "--feedback is required when rejecting a plan"
        )}\n`
      );
      console.error(
        `  ${c.dim(
          'Usage: locus plan --reject <plan-id> --feedback "your feedback"'
        )}\n`
      );
      process.exit(1);
    }
    return rejectPlan(planManager, values.reject as string, feedback);
  }

  // ── Approve plan (requires API) ─────────────────────────────
  if (values.approve) {
    const { client, workspaceId } = await resolveApiContext(
      projectPath,
      values
    );
    return approvePlan(
      planManager,
      values.approve as string,
      client,
      workspaceId
    );
  }

  // ── Trigger new planning meeting ────────────────────────────
  const directive = positionals.join(" ").trim();
  if (!directive) {
    showPlanHelp();
    return;
  }

  const planSettings = new SettingsManager(projectPath).load();

  const provider = resolveProvider(
    (values.provider as string) || planSettings.provider
  );
  const model =
    (values.model as string | undefined) ||
    planSettings.model ||
    DEFAULT_MODEL[provider];

  const aiRunner = createAiRunner(provider, {
    projectPath,
    model,
  });

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
    `\n  ${c.header(" PLANNING MEETING ")} ${c.bold(
      "Starting async planning meeting..."
    )}\n`
  );
  console.log(`  ${c.dim("Directive:")} ${c.bold(directive)}\n`);

  // Check if there's a rejected plan with feedback for re-planning
  const pendingPlans = planManager.list("rejected");
  let feedback: string | undefined;
  const latestRejected = pendingPlans.find(
    (p) => p.directive === directive && p.feedback
  );
  if (latestRejected) {
    feedback = latestRejected.feedback;
    console.log(
      `  ${c.info("ℹ")} ${c.dim(
        "Re-planning with CEO feedback:"
      )} ${feedback}\n`
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

    console.log(
      `\n  ${c.success("✔")} ${c.success("Planning meeting complete!")}\n`
    );
    console.log(
      `  ${c.dim("Plan saved as:")} ${c.primary(result.plan.name)} ${c.dim(
        `(${result.plan.id})`
      )}\n`
    );

    // Display a summary
    printPlanSummary(result.plan);

    console.log(
      `  ${c.dim("To review the full plan:")} ${c.cyan(
        `locus plan --show ${result.plan.id}`
      )}`
    );
    console.log(
      `  ${c.dim("To approve:")} ${c.cyan(
        `locus plan --approve ${result.plan.id}`
      )}`
    );
    console.log(
      `  ${c.dim("To reject:")} ${c.cyan(
        `locus plan --reject ${result.plan.id} --feedback "..."`
      )}`
    );
    console.log(
      `  ${c.dim("To cancel:")} ${c.cyan(
        `locus plan --cancel ${result.plan.id}`
      )}\n`
    );
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red("Planning meeting failed:")} ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
    process.exit(1);
  }
}

// ── Sub-commands ──────────────────────────────────────────────

function listPlans(planManager: PlanManager): void {
  const plans = planManager.list();

  if (plans.length === 0) {
    console.log(`\n  ${c.dim("No plans found.")}\n`);
    console.log(
      `  ${c.dim("Create one with:")} ${c.cyan(
        'locus plan "build user auth"'
      )}\n`
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

function showPlan(planManager: PlanManager, idOrSlug: string): void {
  const md = planManager.getMarkdown(idOrSlug);
  if (!md) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(`Plan not found: ${idOrSlug}`)}\n`
    );
    process.exit(1);
  }
  console.log(`\n${md}\n`);
}

function cancelPlan(planManager: PlanManager, idOrSlug: string): void {
  try {
    planManager.cancel(idOrSlug);
    console.log(`\n  ${c.success("✔")} ${c.dim("Plan cancelled.")}\n`);
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        error instanceof Error ? error.message : String(error)
      )}\n`
    );
    process.exit(1);
  }
}

function rejectPlan(
  planManager: PlanManager,
  idOrSlug: string,
  feedback: string
): void {
  try {
    const plan = planManager.reject(idOrSlug, feedback);
    console.log(
      `\n  ${c.warning("!")} ${c.bold("Plan rejected:")} ${plan.name}\n`
    );
    console.log(`  ${c.dim("Feedback saved:")} ${feedback}\n`);
    console.log(
      `  ${c.dim(
        "Re-run the planning meeting with the same directive to incorporate feedback:"
      )}`
    );
    console.log(`  ${c.cyan(`locus plan "${plan.directive}"`)}\n`);
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        error instanceof Error ? error.message : String(error)
      )}\n`
    );
    process.exit(1);
  }
}

async function approvePlan(
  planManager: PlanManager,
  idOrSlug: string,
  client: LocusClient,
  workspaceId: string
): Promise<void> {
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

    console.log(`\n  ${c.dim("Start agents with:")} ${c.cyan("locus run")}\n`);
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        error instanceof Error ? error.message : String(error)
      )}\n`
    );
    process.exit(1);
  }
}

// ── Helpers ──────────────────────────────────────────────────

async function resolveApiContext(
  projectPath: string,
  values: Record<string, unknown>
): Promise<{ client: LocusClient; workspaceId: string }> {
  const configManager = new ConfigManager(projectPath);
  configManager.updateVersion(VERSION);

  const settingsManager = new SettingsManager(projectPath);
  const settings = settingsManager.load();

  const apiKey = (values["api-key"] as string) || settings.apiKey;
  if (!apiKey) {
    console.error(
      `\n  ${c.error("✖")} ${c.red("API key is required for this operation")}\n`
    );
    console.error(
      `  ${c.dim(
        "Configure with: locus config setup --api-key <key>\n  Or pass --api-key flag"
      )}\n`
    );
    process.exit(1);
  }

  const apiBase =
    (values["api-url"] as string) ||
    settings.apiUrl ||
    "https://api.locusai.dev/api";

  const resolver = new WorkspaceResolver({
    apiKey,
    apiBase,
    workspaceId: values.workspace as string | undefined,
  });

  const workspaceId = await resolver.resolve();

  const client = new LocusClient({
    baseUrl: apiBase,
    token: apiKey,
  });

  return { client, workspaceId };
}

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
  ${c.header(" LOCUS PLAN ")} ${c.dim("— Sprint Planning Meeting")}

  ${c.bold("Usage:")}
    ${c.cyan('locus plan "directive"')}          Trigger a planning meeting
    ${c.cyan("locus plan --list")}                List all plans
    ${c.cyan("locus plan --show <id>")}           Show plan details
    ${c.cyan(
      "locus plan --approve <id>"
    )}        Approve plan (creates sprint + tasks)
    ${c.cyan("locus plan --reject <id>")}         Reject plan with feedback
    ${c.cyan("locus plan --cancel <id>")}         Cancel a plan

  ${c.bold("Options:")}
    ${c.dim("--api-key <key>")}    API key override (reads from settings.json)
    ${c.dim(
      "--api-url <url>"
    )}    API base URL (default: https://api.locusai.dev/api)
    ${c.dim("--workspace <id>")}   Workspace ID
    ${c.dim("--model <model>")}    AI model to use
    ${c.dim("--provider <p>")}     AI provider (claude, codex)
    ${c.dim("--feedback <text>")}  CEO feedback when rejecting
    ${c.dim("--dir <path>")}       Project directory

  ${c.bold("Examples:")}
    ${c.dim("# Start a planning meeting")}
    ${c.cyan('locus plan "build user authentication with OAuth and email"')}

    ${c.dim("# Approve the resulting plan")}
    ${c.cyan("locus plan --approve plan-1234567890")}

    ${c.dim("# Reject and re-plan")}
    ${c.cyan(
      'locus plan --reject plan-1234567890 --feedback "split auth into two tasks"'
    )}
    ${c.cyan('locus plan "build user authentication with OAuth and email"')}

    ${c.dim("# Cancel a plan")}
    ${c.cyan("locus plan --cancel plan-1234567890")}
`);
}
