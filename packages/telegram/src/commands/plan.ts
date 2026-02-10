import type { Context } from "telegraf";
import type { CliExecutor } from "../executor.js";
import { formatCommandOutput, formatError, formatInfo } from "../formatter.js";
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
  executor: CliExecutor
): Promise<void> {
  console.log("[plans] Listing plans");
  const args = executor.buildArgs(["plan", "--list"]);
  const result = await executor.execute(args);
  const output = (result.stdout + result.stderr).trim();

  await ctx.reply(
    formatCommandOutput("locus plan --list", output, result.exitCode),
    { parse_mode: "HTML" }
  );
}

export async function approveCommand(
  ctx: Context,
  executor: CliExecutor
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

  await ctx.reply(formatInfo(`Approving plan: ${planId}...`), {
    parse_mode: "HTML",
  });

  const args = executor.buildArgs(["plan", "--approve", planId], {
    needsApiKey: true,
  });
  const result = await executor.execute(args);
  const output = (result.stdout + result.stderr).trim();

  await ctx.reply(
    formatCommandOutput("locus plan --approve", output, result.exitCode),
    { parse_mode: "HTML" }
  );
}

export async function rejectCommand(
  ctx: Context,
  executor: CliExecutor
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
      {
        parse_mode: "HTML",
      }
    );
    return;
  }

  await ctx.reply(formatInfo(`Rejecting plan: ${planId}...`), {
    parse_mode: "HTML",
  });

  const args = executor.buildArgs(
    ["plan", "--reject", planId, "--feedback", feedback],
    { needsApiKey: false }
  );
  const result = await executor.execute(args);
  const output = (result.stdout + result.stderr).trim();

  await ctx.reply(
    formatCommandOutput("locus plan --reject", output, result.exitCode),
    { parse_mode: "HTML" }
  );
}

export async function cancelCommand(
  ctx: Context,
  executor: CliExecutor
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

  const args = executor.buildArgs(["plan", "--cancel", planId]);
  const result = await executor.execute(args);
  const output = (result.stdout + result.stderr).trim();

  await ctx.reply(
    formatCommandOutput("locus plan --cancel", output, result.exitCode),
    { parse_mode: "HTML" }
  );
}
