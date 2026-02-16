import { SprintStatus } from "@locusai/shared";
import type { Context } from "telegraf";
import { getClientAndWorkspace, requireApiKey } from "../api-client.js";
import type { TelegramConfig } from "../config.js";
import { escapeHtml, formatError, formatInfo } from "../formatter.js";

export async function sprintsCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[sprints] Listing sprints");

  if (!(await requireApiKey(ctx, config, "sprints"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);
    const sprints = await client.sprints.list(workspaceId);

    if (sprints.length === 0) {
      await ctx.reply(formatInfo("No sprints found."), {
        parse_mode: "HTML",
      });
      return;
    }

    const statusIcon: Record<string, string> = {
      [SprintStatus.ACTIVE]: "🟢",
      [SprintStatus.PLANNED]: "📋",
      [SprintStatus.COMPLETED]: "✅",
    };

    // Group sprints by status
    const active = sprints.filter((s) => s.status === SprintStatus.ACTIVE);
    const planned = sprints.filter((s) => s.status === SprintStatus.PLANNED);
    const completed = sprints.filter(
      (s) => s.status === SprintStatus.COMPLETED
    );

    let msg = "<b>Sprints</b>\n\n";

    const formatGroup = (
      label: string,
      items: typeof sprints,
      icon: string
    ) => {
      if (items.length === 0) return;
      msg += `<b>${label}</b>\n`;
      for (const sprint of items) {
        msg += `${icon} <b>${escapeHtml(sprint.name)}</b>\n`;
        msg += `   Status: \`${sprint.status}\`\n`;
        msg += `   ID: \`${sprint.id}\`\n\n`;
      }
    };

    formatGroup("Active", active, statusIcon[SprintStatus.ACTIVE]);
    formatGroup("Planned", planned, statusIcon[SprintStatus.PLANNED]);
    formatGroup("Completed", completed, statusIcon[SprintStatus.COMPLETED]);

    await ctx.reply(msg.trim(), {
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error("[sprints] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to fetch sprints: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

export async function completeSprintCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const sprintId = text.replace(/^\/completesprint\s*/, "").trim();

  console.log(`[completesprint] Received: ${sprintId || "(empty)"}`);

  if (!sprintId) {
    await ctx.reply(formatError("Usage: /completesprint &lt;sprint-id&gt;"), {
      parse_mode: "HTML",
    });
    return;
  }

  if (!(await requireApiKey(ctx, config, "completesprint"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);

    // Verify sprint exists
    const sprint = await client.sprints.getById(sprintId, workspaceId);

    if (sprint.status === SprintStatus.COMPLETED) {
      await ctx.reply(
        formatInfo(`Sprint "${escapeHtml(sprint.name)}" is already completed.`),
        { parse_mode: "HTML" }
      );
      return;
    }

    await client.sprints.complete(sprintId, workspaceId);

    console.log(`[completesprint] Sprint ${sprintId} completed`);

    await ctx.reply(
      `✅ Sprint "<b>${escapeHtml(sprint.name)}</b>" has been completed.\n\nIN_REVIEW tasks moved to DONE. IN_PROGRESS tasks moved to BACKLOG.`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("[completesprint] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to complete sprint: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}
