import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Context } from "telegraf";
import type { TelegramConfig } from "../config.js";
import { escapeHtml, formatError, formatSuccess } from "../formatter.js";

const CONFIG_DIR = ".locus";
const SETTINGS_FILE = "settings.json";

/** Settings keys that can be modified via /config */
const ALLOWED_KEYS: Record<string, { description: string; validate?: (value: string) => string | null }> = {
  provider: {
    description: "AI provider (claude, codex)",
    validate: (v) => ["claude", "codex"].includes(v) ? null : "Invalid provider. Must be: claude, codex",
  },
  model: {
    description: "AI model override (e.g. opus, sonnet, haiku)",
  },
  apiUrl: {
    description: "Locus API base URL",
  },
  agentCount: {
    description: "Default number of agents for /run (1-5)",
    validate: (v) => {
      const n = Number.parseInt(v, 10);
      if (Number.isNaN(n) || n < 1 || n > 5) return "Must be a number between 1 and 5";
      return null;
    },
  },
};

const USAGE = `<b>Usage:</b>
/config — Show current settings
/config set &lt;key&gt; &lt;value&gt; — Update a setting
/config unset &lt;key&gt; — Remove a setting

<b>Available keys:</b>
${Object.entries(ALLOWED_KEYS).map(([k, v]) => `  <code>${k}</code> — ${v.description}`).join("\n")}`;

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
    const display = value !== undefined && value !== null ? String(value) : "<i>not set</i>";
    msg += `<code>${escapeHtml(key)}</code>: ${value !== undefined && value !== null ? `<code>${escapeHtml(String(value))}</code>` : display}\n`;
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
        await ctx.reply(formatError("No settings file found. Run locus init first."), {
          parse_mode: "HTML",
        });
        return;
      }
      await ctx.reply(formatSettingsDisplay(settings), { parse_mode: "HTML" });
    } catch (err) {
      await ctx.reply(
        formatError(`Failed to read settings: ${err instanceof Error ? err.message : String(err)}`),
        { parse_mode: "HTML" }
      );
    }
    return;
  }

  const parts = input.split(/\s+/);
  const subcommand = parts[0];

  if (subcommand === "set") {
    const key = parts[1];
    const value = parts.slice(2).join(" ");

    if (!key || !value) {
      await ctx.reply(formatError("Usage: /config set &lt;key&gt; &lt;value&gt;"), {
        parse_mode: "HTML",
      });
      return;
    }

    if (!ALLOWED_KEYS[key]) {
      await ctx.reply(
        formatError(`Unknown key: ${escapeHtml(key)}\n\nAllowed keys: ${Object.keys(ALLOWED_KEYS).join(", ")}`),
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

      // Store numeric values as numbers
      if (key === "agentCount") {
        settings[key] = Number.parseInt(value, 10);
      } else {
        settings[key] = value;
      }

      saveSettings(config, settings);

      await ctx.reply(
        formatSuccess(`Set <code>${escapeHtml(key)}</code> = <code>${escapeHtml(value)}</code>`),
        { parse_mode: "HTML" }
      );
    } catch (err) {
      await ctx.reply(
        formatError(`Failed to update settings: ${err instanceof Error ? err.message : String(err)}`),
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
        formatError(`Unknown key: ${escapeHtml(key)}\n\nAllowed keys: ${Object.keys(ALLOWED_KEYS).join(", ")}`),
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

      await ctx.reply(formatSuccess(`Removed <code>${escapeHtml(key)}</code> from settings.`), {
        parse_mode: "HTML",
      });
    } catch (err) {
      await ctx.reply(
        formatError(`Failed to update settings: ${err instanceof Error ? err.message : String(err)}`),
        { parse_mode: "HTML" }
      );
    }
    return;
  }

  // Unknown subcommand — show usage
  await ctx.reply(USAGE, { parse_mode: "HTML" });
}
