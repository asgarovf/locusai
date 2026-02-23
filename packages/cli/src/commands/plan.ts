import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  cancelPlan,
  createCliLogger,
  listPlans,
  rejectPlan,
  resolveAiSettings,
  resolveApiContext,
  showPlan,
} from "@locusai/commands";
import {
  c,
  createAiRunner,
  getLocusPath,
  LocusClient,
  PlanManager,
  PlanningMeeting,
} from "@locusai/sdk/node";
import { ConfigManager } from "../config-manager";
import { requireInitialization, VERSION } from "../utils";

/**
 * Normalise plan-ID arguments so `--approve plan -1771009897498` is
 * treated the same as `--approve plan-1771009897498`.
 *
 * Node's `parseArgs` splits `plan -<digits>` into separate tokens,
 * breaking the ID. This pre-processes the args array to merge them.
 */
function normalizePlanIdArgs(args: string[]): string[] {
  const planIdFlags = new Set(["--approve", "--reject", "--cancel", "--show"]);

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
      "reasoning-effort": { type: "string" },
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
    return renderPlanList(planManager);
  }

  // ── Show plan details ───────────────────────────────────────
  if (values.show) {
    const md = showPlan(planManager, values.show as string);
    if (!md) {
      console.error(
        `\n  ${c.error("✖")} ${c.red(`Plan not found: ${values.show}`)}\n`
      );
      process.exit(1);
    }
    console.log(`\n${md}\n`);
    return;
  }

  // ── Cancel plan ─────────────────────────────────────────────
  if (values.cancel) {
    try {
      cancelPlan(planManager, values.cancel as string);
      console.log(`\n  ${c.success("✔")} ${c.dim("Plan cancelled.")}\n`);
    } catch (error) {
      console.error(
        `\n  ${c.error("✖")} ${c.red(
          error instanceof Error ? error.message : String(error)
        )}\n`
      );
      process.exit(1);
    }
    return;
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
    try {
      const plan = rejectPlan(planManager, values.reject as string, feedback);
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
    return;
  }

  // ── Approve plan (requires API) ─────────────────────────────
  if (values.approve) {
    const configManager = new ConfigManager(projectPath);
    configManager.updateVersion(VERSION);

    try {
      const { client, workspaceId } = await resolveApiContext({
        projectPath,
        apiKey: values["api-key"] as string | undefined,
        apiUrl: values["api-url"] as string | undefined,
        workspaceId: values.workspace as string | undefined,
      });
      return await renderApprovePlan(
        planManager,
        values.approve as string,
        client,
        workspaceId
      );
    } catch (error) {
      console.error(
        `\n  ${c.error("✖")} ${c.red(
          error instanceof Error ? error.message : String(error)
        )}\n`
      );
      process.exit(1);
    }
  }

  // ── Trigger new planning meeting ────────────────────────────
  const directive = positionals.join(" ").trim();
  if (!directive) {
    showPlanHelp();
    return;
  }

  const { provider, model } = resolveAiSettings({
    projectPath,
    provider: values.provider as string | undefined,
    model: values.model as string | undefined,
  });

  const reasoningEffort = values["reasoning-effort"] as string | undefined;

  const aiRunner = createAiRunner(provider, {
    projectPath,
    model,
    reasoningEffort,
  });

  const log = createCliLogger();

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

    // Save the plan with proper slug name + markdown, then clean up the temp file
    planManager.save(result.plan);

    // Remove the temp file created by the AI agent (plan-<timestamp>.json)
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

// ── CLI rendering helpers ─────────────────────────────────────

function renderPlanList(planManager: PlanManager): void {
  const plans = listPlans(planManager);

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
      )} ${c.dim(`— ${plan.taskCount} tasks`)}`
    );
    console.log(`    ${c.dim("ID:")} ${plan.id}`);
    console.log(`    ${c.dim("Created:")} ${plan.createdAt}`);
    if (plan.feedback) {
      console.log(`    ${c.dim("Feedback:")} ${plan.feedback}`);
    }
    console.log("");
  }
}

async function renderApprovePlan(
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
    ${c.dim("--model <model>")}    AI model (claude: opus, sonnet, haiku | codex: gpt-5.3-codex, gpt-5-codex-mini)
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
