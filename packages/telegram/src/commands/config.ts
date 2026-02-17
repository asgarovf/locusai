import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Context } from "telegraf";
import {
  isValidModelForProvider,
  getModelsForProvider,
  PROVIDER,
  DEFAULT_MODEL,
  type Provider,
} from "@locusai/sdk/node";
import { parseArgs } from "../command-whitelist.js";
import type { TelegramConfig } from "../config.js";
import { escapeHtml, formatError, formatSuccess } from "../formatter.js";

const CONFIG_DIR = ".locus";
const SETTINGS_FILE = "settings.json";

/** Settings keys that can be modified via /config */
const ALLOWED_KEYS: Record<
  string,
  { description: string; validate?: (value: string) => string | null }
> = {
  provider: {
    description: "AI provider (claude, codex)",
    validate: (v) =>
      ["claude", "codex"].includes(v)
        ? null
        : "Invalid provider. Must be: claude, codex",
  },
  model: {
    description: "AI model override (use /config models to see valid options)",
  },
  apiUrl: {
    description: "Locus API base URL",
  },
};

const USAGE = `<b>Usage:</b>
/config — Show current settings
/config set &lt;key&gt; &lt;value&gt; — Update a setting
/config unset &lt;key&gt; — Remove a setting
/config models — List available models for current provider

<b>Available keys:</b>
${Object.entries(ALLOWED_KEYS)
  .map(([k, v]) => `  \`${k}\` — ${v.description}`)
  .join("\n")}`;

interface SettingsJson {
  [key: string]: unknown;
}

function getSettingsPath(config: TelegramConfig): string {
  return join(config.projectPath, CONFIG_DIR, SETTINGS_FILE);
}

function loadSettings(config: TelegramConfig): SettingsJson | null {
  const path = getSettingsPath(config);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as SettingsJson;
}

function saveSettings(config: TelegramConfig, settings: SettingsJson): void {
  const path = getSettingsPath(config);
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
}

function formatSettingsDisplay(settings: SettingsJson): string {
  let msg = "<b>Current Settings</b>\n\n";

  for (const key of Object.keys(ALLOWED_KEYS)) {
    const value = settings[key];
    const display =
      value !== undefined && value !== null ? String(value) : "<i>not set</i>";
    msg += `\`${escapeHtml(key)}\`: ${value !== undefined && value !== null ? `\`${escapeHtml(String(value))}\`` : display}\n`;
  }

  return msg;
}

export async function configCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const input = text.replace(/^\/config\s*/, "").trim();

  console.log(`[config] Received: ${input || "(empty)"}`);

  // No args — show current settings
  if (!input) {
    try {
      const settings = loadSettings(config);
      if (!settings) {
        await ctx.reply(
          formatError("No settings file found. Run locus init first."),
          {
            parse_mode: "HTML",
          }
        );
        return;
      }
      await ctx.reply(formatSettingsDisplay(settings), { parse_mode: "HTML" });
    } catch (err) {
      await ctx.reply(
        formatError(
          `Failed to read settings: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
    return;
  }

  const parts = parseArgs(input);
  const subcommand = parts[0];

  if (subcommand === "set") {
    const key = parts[1];
    const value = parts.slice(2).join(" ");

    if (!key || !value) {
      await ctx.reply(
        formatError("Usage: /config set &lt;key&gt; &lt;value&gt;"),
        {
          parse_mode: "HTML",
        }
      );
      return;
    }

    if (!ALLOWED_KEYS[key]) {
      await ctx.reply(
        formatError(
          `Unknown key: ${escapeHtml(key)}\n\nAllowed keys: ${Object.keys(ALLOWED_KEYS).join(", ")}`
        ),
        { parse_mode: "HTML" }
      );
      return;
    }

    const validator = ALLOWED_KEYS[key].validate;
    if (validator) {
      const error = validator(value);
      if (error) {
        await ctx.reply(formatError(error), { parse_mode: "HTML" });
        return;
      }
    }

    try {
      const settings = loadSettings(config) || {};

      // Cross-validate model against current provider
      if (key === "model") {
        const currentProvider =
          (settings.provider as string) ||
          config.provider ||
          PROVIDER.CLAUDE;
        if (
          !isValidModelForProvider(currentProvider as Provider, value)
        ) {
          const validModels = getModelsForProvider(
            currentProvider as Provider
          );
          await ctx.reply(
            formatError(
              `Model "${escapeHtml(value)}" is not valid for provider "${escapeHtml(currentProvider)}".\n\nValid models: ${validModels.join(", ")}`
            ),
            { parse_mode: "HTML" }
          );
          return;
        }
      }

      // When changing provider, reset model if it's invalid for the new provider
      let modelResetNote = "";
      if (key === "provider") {
        const currentModel =
          (settings.model as string) || config.model;
        if (
          currentModel &&
          !isValidModelForProvider(value as Provider, currentModel)
        ) {
          const newDefault = DEFAULT_MODEL[value as Provider];
          settings.model = newDefault;
          modelResetNote = `\nModel was reset to \`${escapeHtml(newDefault)}\` (previous model not valid for ${escapeHtml(value)}).`;
        }
      }

      settings[key] = value;

      saveSettings(config, settings);

      await ctx.reply(
        formatSuccess(
          `Set \`${escapeHtml(key)}\` = \`${escapeHtml(value)}\`${modelResetNote}`
        ),
        { parse_mode: "HTML" }
      );
    } catch (err) {
      await ctx.reply(
        formatError(
          `Failed to update settings: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
    return;
  }

  if (subcommand === "unset") {
    const key = parts[1];

    if (!key) {
      await ctx.reply(formatError("Usage: /config unset &lt;key&gt;"), {
        parse_mode: "HTML",
      });
      return;
    }

    if (!ALLOWED_KEYS[key]) {
      await ctx.reply(
        formatError(
          `Unknown key: ${escapeHtml(key)}\n\nAllowed keys: ${Object.keys(ALLOWED_KEYS).join(", ")}`
        ),
        { parse_mode: "HTML" }
      );
      return;
    }

    try {
      const settings = loadSettings(config);
      if (!settings) {
        await ctx.reply(formatError("No settings file found."), {
          parse_mode: "HTML",
        });
        return;
      }

      delete settings[key];
      saveSettings(config, settings);

      await ctx.reply(
        formatSuccess(`Removed \`${escapeHtml(key)}\` from settings.`),
        {
          parse_mode: "HTML",
        }
      );
    } catch (err) {
      await ctx.reply(
        formatError(
          `Failed to update settings: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
    return;
  }

  if (subcommand === "models") {
    const settings = loadSettings(config) || {};
    const currentProvider =
      (settings.provider as string) || config.provider || PROVIDER.CLAUDE;
    const models = getModelsForProvider(currentProvider as Provider);
    const defaultModel = DEFAULT_MODEL[currentProvider as Provider];
    let msg = `Available models for <b>${escapeHtml(currentProvider)}</b>:\n\n`;
    for (const m of models) {
      const isDefault = m === defaultModel ? " (default)" : "";
      msg += `• ${escapeHtml(m)}${isDefault}\n`;
    }
    msg += `\nSet with: /config set model &lt;name&gt;`;
    await ctx.reply(msg, { parse_mode: "HTML" });
    return;
  }

  // Unknown subcommand — show usage
  await ctx.reply(USAGE, { parse_mode: "HTML" });
}
