import { existsSync } from "node:fs";
import { join } from "node:path";
import { findArtifact, formatSize, listArtifacts } from "@locusai/commands";
import type { Context } from "telegraf";
import { Markup } from "telegraf";
import type { TelegramConfig } from "../config.js";
import type { CliExecutor } from "../executor.js";
import {
  escapeHtml,
  formatError,
  formatInfo,
  formatRelativeTime,
  splitMessage,
  truncateOutput,
} from "../formatter.js";

const ARTIFACTS_DIR = ".locus/artifacts";

/**
 * /artifacts — List all artifacts with inline buttons to view/plan.
 */
export async function artifactsCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const args = text.replace(/^\/artifacts\s*/, "").trim();

  console.log(`[artifacts] Received: ${args || "(list)"}`);

  // If an argument is provided, treat it as a "show" request
  if (args) {
    await showArtifact(ctx, config, args);
    return;
  }

  const artifacts = listArtifacts(config.projectPath);

  if (artifacts.length === 0) {
    await ctx.reply(formatInfo("No artifacts found."), {
      parse_mode: "HTML",
    });
    return;
  }

  let msg = `<b>📄 Artifacts</b> (${artifacts.length} total)\n\n`;

  for (let i = 0; i < artifacts.length; i++) {
    const artifact = artifacts[i];
    const age = formatRelativeTime(artifact.createdAt);
    const size = formatSize(artifact.size);
    const index = String(i + 1).padStart(2, " ");

    msg += `${index}. <b>${escapeHtml(artifact.name)}</b>\n`;
    msg += `     <i>${age} • ${size}</i>\n`;
  }

  msg += `\nTap an artifact below to view or convert to plan.`;

  // Create inline buttons for the first 10 artifacts (Telegram button limit)
  const buttons = artifacts
    .slice(0, 10)
    .map((artifact) => [
      Markup.button.callback(
        `👁 ${artifact.name.slice(0, 30)}`,
        `view:artifact:${artifact.name.slice(0, 40)}`
      ),
      Markup.button.callback(
        "📋 Plan",
        `plan:artifact:${artifact.name.slice(0, 40)}`
      ),
    ]);

  const parts = splitMessage(msg);
  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    await ctx.reply(parts[i], {
      parse_mode: "HTML",
      ...(isLast ? Markup.inlineKeyboard(buttons) : {}),
    });
  }
}

/**
 * Show the content of a specific artifact.
 */
export async function showArtifact(
  ctx: Context,
  config: TelegramConfig,
  name: string
): Promise<void> {
  const result = findArtifact(config.projectPath, name);

  if (!result) {
    await ctx.reply(formatError(`Artifact "${escapeHtml(name)}" not found.`), {
      parse_mode: "HTML",
    });
    return;
  }

  if (!result.match) {
    let msg = `<b>Multiple artifacts match "${escapeHtml(name)}":</b>\n\n`;
    for (const m of result.ambiguous) {
      msg += `• <b>${escapeHtml(m.name)}</b>\n`;
    }
    await ctx.reply(msg, { parse_mode: "HTML" });
    return;
  }

  const truncated = truncateOutput(escapeHtml(result.content), 3500);
  const artifactName = result.info.name;

  let msg = `<b>📄 ${escapeHtml(artifactName)}</b>\n\n`;
  msg += `<pre>${truncated}</pre>`;

  const buttons = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "📋 Convert to Plan",
        `plan:artifact:${artifactName.slice(0, 40)}`
      ),
    ],
  ]);

  const msgParts = splitMessage(msg);
  for (let i = 0; i < msgParts.length; i++) {
    const isLast = i === msgParts.length - 1;
    await ctx.reply(msgParts[i], {
      parse_mode: "HTML",
      ...(isLast ? buttons : {}),
    });
  }
}

/**
 * Convert an artifact to a plan by running exec.
 */
export async function convertArtifactToPlan(
  ctx: Context,
  config: TelegramConfig,
  executor: CliExecutor,
  name: string
): Promise<void> {
  const artifactName = name.replace(/\.md$/, "");

  // Verify artifact exists
  const artifactsDir = join(config.projectPath, ARTIFACTS_DIR);
  const filePath = join(artifactsDir, `${artifactName}.md`);

  if (!existsSync(filePath)) {
    // Try partial match
    const result = findArtifact(config.projectPath, name);
    if (!result || !result.match) {
      await ctx.reply(
        formatError(`Artifact "${escapeHtml(name)}" not found.`),
        { parse_mode: "HTML" }
      );
      return;
    }
  }

  await ctx.reply(
    formatInfo(`Converting <b>${escapeHtml(artifactName)}</b> to a plan...`),
    { parse_mode: "HTML" }
  );

  const directive = `Prepare a plan according to the artifact: ${artifactName}`;
  const args = executor.buildArgs(["plan", directive, "--no-stream"]);

  executor.execute(args).then(
    async (result) => {
      const output = (result.stdout + result.stderr).trim();
      try {
        if (!output && result.exitCode !== 0) {
          await ctx.reply(
            formatError("Plan conversion failed with no output."),
            { parse_mode: "HTML" }
          );
          return;
        }
        const cleanOutput = truncateOutput(escapeHtml(output), 3500);
        let msg = `<b>📋 Plan from: ${escapeHtml(artifactName)}</b>\n\n`;
        msg += `<pre>${cleanOutput}</pre>`;

        const msgParts = splitMessage(msg);
        for (const part of msgParts) {
          await ctx.reply(part, { parse_mode: "HTML" });
        }
      } catch (err) {
        console.error("[artifacts:plan] Failed to send result:", err);
      }
    },
    async (err) => {
      try {
        await ctx.reply(
          formatError(
            `Plan conversion failed: ${err instanceof Error ? err.message : String(err)}`
          ),
          { parse_mode: "HTML" }
        );
      } catch {
        console.error("[artifacts:plan] Failed to send error:", err);
      }
    }
  );
}
