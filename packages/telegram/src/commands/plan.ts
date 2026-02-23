import {
  cancelPlan,
  listPlans,
  rejectPlan,
  resolveApiContext,
} from "@locusai/commands";
import { PlanManager } from "@locusai/sdk/node";
import type { Context } from "telegraf";
import { Markup } from "telegraf";
import type { TelegramConfig } from "../config.js";
import type { CliExecutor } from "../executor.js";
import {
  escapeHtml,
  formatCommandOutput,
  formatError,
  formatInfo,
  formatSuccess,
} from "../formatter.js";
import { PLAN_TIMEOUT } from "../timeouts.js";

export async function planCommand(
  ctx: Context,
  executor: CliExecutor
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const directive = text.replace(/^\/plan\s*/, "").trim();

  console.log(`[plan] Received: ${directive || "(empty)"}`);

  if (!directive) {
    await ctx.reply(
      formatInfo(
        'Usage: /plan &lt;directive&gt;\nExample: /plan "build user authentication with OAuth"'
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  await ctx.reply(
    formatInfo(`Starting planning meeting...\nDirective: ${directive}`),
    { parse_mode: "HTML" }
  );

  const args = executor.buildArgs(["plan", directive], { needsApiKey: false });

  // Fire off the process without blocking the Telegraf handler
  executor.execute(args, { timeout: PLAN_TIMEOUT }).then(
    async (result) => {
      const output = (result.stdout + result.stderr).trim();
      try {
        await ctx.reply(
          formatCommandOutput("locus plan", output, result.exitCode),
          { parse_mode: "HTML" }
        );
      } catch (err) {
        console.error("Failed to send plan result:", err);
      }
    },
    async (err) => {
      try {
        await ctx.reply(
          formatError(
            `Plan failed: ${err instanceof Error ? err.message : String(err)}`
          ),
          { parse_mode: "HTML" }
        );
      } catch {
        console.error("Failed to send plan error:", err);
      }
    }
  );
}

export async function plansCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[plans] Listing plans");

  try {
    const planManager = new PlanManager(config.projectPath);
    const plans = listPlans(planManager);

    if (plans.length === 0) {
      await ctx.reply(
        formatInfo("No plans found. Create one with /plan &lt;directive&gt;"),
        { parse_mode: "HTML" }
      );
      return;
    }

    const statusIcons: Record<string, string> = {
      pending: "🟡",
      approved: "✅",
      rejected: "❌",
      cancelled: "⊘",
    };

    let msg = "<b>📋 Sprint Plans</b>\n\n";
    for (const p of plans) {
      const icon = statusIcons[p.status] || "•";
      msg += `${icon} <b>${escapeHtml(p.name)}</b> [${p.status}]\n`;
      msg += `   ${p.taskCount} tasks · <code>${p.id}</code>\n`;
      if (p.feedback) {
        msg += `   Feedback: ${escapeHtml(p.feedback)}\n`;
      }
      msg += "\n";
    }

    // Add action buttons for pending plans
    const pendingPlans = plans.filter((p) => p.status === "pending");
    if (pendingPlans.length > 0) {
      const buttons = pendingPlans
        .slice(0, 5)
        .map((p) => [
          Markup.button.callback("✅ Approve", `approve:plan:${p.id}`),
          Markup.button.callback("❌ Cancel", `cancel:plan:${p.id}`),
        ]);
      await ctx.reply(msg.trim(), {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(buttons),
      });
    } else {
      await ctx.reply(msg.trim(), { parse_mode: "HTML" });
    }
  } catch (err) {
    console.error("[plans] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to list plans: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

export async function approveCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const planId = text.replace(/^\/approve\s*/, "").trim();

  console.log(`[approve] Received: ${planId || "(empty)"}`);

  if (!planId) {
    await ctx.reply(formatError("Usage: /approve &lt;plan-id&gt;"), {
      parse_mode: "HTML",
    });
    return;
  }

  if (!config.apiKey) {
    await ctx.reply(
      formatError(
        "API key is required for /approve. Run: locus config setup --api-key &lt;KEY&gt;"
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  await ctx.reply(formatInfo(`Approving plan: ${planId}...`), {
    parse_mode: "HTML",
  });

  try {
    const { client, workspaceId } = await resolveApiContext({
      projectPath: config.projectPath,
      apiKey: config.apiKey,
      apiUrl: config.apiBase,
      workspaceId: config.workspaceId,
    });

    const planManager = new PlanManager(config.projectPath);
    const { sprint, tasks } = await planManager.approve(
      planId,
      client,
      workspaceId
    );

    let msg = `✅ <b>Sprint created: ${escapeHtml(sprint.name)}</b>\n\n`;
    msg += `Sprint ID: <code>${sprint.id}</code>\n`;
    msg += `Tasks: ${tasks.length}\n\n`;

    for (const task of tasks) {
      msg += `• ${escapeHtml(task.title)} [${task.assigneeRole || "UNASSIGNED"}]\n`;
    }

    await ctx.reply(msg.trim(), { parse_mode: "HTML" });
  } catch (err) {
    console.error("[approve] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to approve plan: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

export async function rejectCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const parts = text.replace(/^\/reject\s*/, "").trim();

  console.log(`[reject] Received: ${parts || "(empty)"}`);

  // First word is plan ID, rest is feedback
  const spaceIndex = parts.indexOf(" ");
  if (spaceIndex === -1 || !parts) {
    await ctx.reply(
      formatError("Usage: /reject &lt;plan-id&gt; &lt;feedback&gt;"),
      { parse_mode: "HTML" }
    );
    return;
  }

  const planId = parts.slice(0, spaceIndex);
  const feedback = parts.slice(spaceIndex + 1).trim();

  if (!feedback) {
    await ctx.reply(
      formatError("Feedback is required when rejecting a plan."),
      { parse_mode: "HTML" }
    );
    return;
  }

  try {
    const planManager = new PlanManager(config.projectPath);
    const plan = rejectPlan(planManager, planId, feedback);

    await ctx.reply(
      formatSuccess(
        `Plan rejected: ${escapeHtml(plan.name)}\nFeedback: ${escapeHtml(feedback)}\n\nRe-run /plan with the same directive to incorporate feedback.`
      ),
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("[reject] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to reject plan: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

export async function cancelCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const planId = text.replace(/^\/cancel\s*/, "").trim();

  console.log(`[cancel] Received: ${planId || "(empty)"}`);

  if (!planId) {
    await ctx.reply(formatError("Usage: /cancel &lt;plan-id&gt;"), {
      parse_mode: "HTML",
    });
    return;
  }

  try {
    const planManager = new PlanManager(config.projectPath);
    cancelPlan(planManager, planId);

    await ctx.reply(formatSuccess(`Plan cancelled: ${escapeHtml(planId)}`), {
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error("[cancel] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to cancel plan: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}
