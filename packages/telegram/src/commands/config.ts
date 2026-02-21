import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_MODEL,
  getModelsForProvider,
  isValidModelForProvider,
  PROVIDER,
  type Provider,
} from "@locusai/sdk/node";
import {
  ChangeCategory,
  type AutonomyRule,
  JobSeverity,
  JobType,
  RiskLevel,
} from "@locusai/shared";
import type { Context } from "telegraf";
import { Markup } from "telegraf";
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

export async function modelCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const input = text.replace(/^\/model\s*/, "").trim();
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  console.log(`[model] Received: ${input || "(empty)"}`);

  const settings = loadSettings(config) || {};
  const currentProvider =
    (settings.provider as string) || config.provider || PROVIDER.CLAUDE;
  const currentModel =
    (settings.model as string) ||
    config.model ||
    DEFAULT_MODEL[currentProvider as Provider];

  if (!input) {
    const models = getModelsForProvider(currentProvider as Provider);
    let msg = `<b>Current model:</b> <code>${escapeHtml(currentModel)}</code>\n`;
    msg += `<b>Provider:</b> <code>${escapeHtml(currentProvider)}</code>\n\n`;
    msg += `<b>Available models:</b>\n`;
    for (const m of models) {
      const marker = m === currentModel ? " ✓" : "";
      msg += `• <code>${escapeHtml(m)}</code>${marker}\n`;
    }
    msg += `\nSwitch: /model &lt;name&gt;`;
    await ctx.reply(msg, { parse_mode: "HTML" });
    return;
  }

  // Validate and set
  if (!isValidModelForProvider(currentProvider as Provider, input)) {
    const models = getModelsForProvider(currentProvider as Provider);
    await ctx.reply(
      formatError(
        `Model "${escapeHtml(input)}" is not valid for provider "${escapeHtml(currentProvider)}".\n\nValid models: ${models.join(", ")}`
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  settings.model = input;
  saveSettings(config, settings);
  await ctx.reply(
    formatSuccess(`Model set to <code>${escapeHtml(input)}</code>`),
    { parse_mode: "HTML" }
  );
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
          (settings.provider as string) || config.provider || PROVIDER.CLAUDE;
        if (!isValidModelForProvider(currentProvider as Provider, value)) {
          const validModels = getModelsForProvider(currentProvider as Provider);
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
        const currentModel = (settings.model as string) || config.model;
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

// ============================================================================
// Setup Jobs Wizard (/setupjobs)
// ============================================================================

interface SetupJobsState {
  enabled: boolean;
  jobs: Set<string>;
  schedule: string;
  scheduleLabel: string;
  autonomyLevel: string;
  autonomyLabel: string;
}

const setupJobsStates = new Map<number, SetupJobsState>();

const JOB_LABELS: Record<string, string> = {
  [JobType.LINT_SCAN]: "Linting scan",
  [JobType.DEPENDENCY_CHECK]: "Dependency check",
  [JobType.TODO_CLEANUP]: "TODO cleanup",
  [JobType.FLAKY_TEST_DETECTION]: "Flaky test detection",
};

const ALL_JOB_TYPES = [
  JobType.LINT_SCAN,
  JobType.DEPENDENCY_CHECK,
  JobType.TODO_CLEANUP,
  JobType.FLAKY_TEST_DETECTION,
];

function buildAutonomyRules(level: string): AutonomyRule[] {
  switch (level) {
    case "conservative":
      return Object.values(ChangeCategory).map((category) => ({
        category,
        riskLevel: RiskLevel.HIGH,
        autoExecute: false,
      }));
    case "aggressive":
      return [
        { category: ChangeCategory.FIX, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.REFACTOR, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.STYLE, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.DEPENDENCY, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.DATABASE, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.AUTH, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.API, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.FEATURE, riskLevel: RiskLevel.HIGH, autoExecute: false },
        { category: ChangeCategory.ARCHITECTURE, riskLevel: RiskLevel.HIGH, autoExecute: false },
      ];
    default: // balanced
      return [
        { category: ChangeCategory.FIX, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.REFACTOR, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.STYLE, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.DEPENDENCY, riskLevel: RiskLevel.LOW, autoExecute: true },
        { category: ChangeCategory.FEATURE, riskLevel: RiskLevel.HIGH, autoExecute: false },
        { category: ChangeCategory.ARCHITECTURE, riskLevel: RiskLevel.HIGH, autoExecute: false },
        { category: ChangeCategory.DATABASE, riskLevel: RiskLevel.HIGH, autoExecute: false },
        { category: ChangeCategory.AUTH, riskLevel: RiskLevel.HIGH, autoExecute: false },
        { category: ChangeCategory.API, riskLevel: RiskLevel.HIGH, autoExecute: false },
      ];
  }
}

export async function setupJobsCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  console.log("[setupjobs] Starting wizard");

  // Initialize state with all jobs enabled
  setupJobsStates.set(chatId, {
    enabled: true,
    jobs: new Set(ALL_JOB_TYPES),
    schedule: "0 2 * * *",
    scheduleLabel: "Nightly (2:00 AM)",
    autonomyLevel: "balanced",
    autonomyLabel: "Balanced",
  });

  const msg =
    `🔧 <b>Job System Setup</b>\n\n` +
    `Configure your always-on AI engineering partner.\n\n` +
    `<b>Step 1/4:</b> Enable autonomous code health maintenance?`;

  await ctx.reply(msg, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Enable", "sjobs_enable"),
        Markup.button.callback("❌ Disable", "sjobs_disable"),
      ],
    ]),
  });
}

function showJobSelection(state: SetupJobsState): {
  text: string;
  buttons: ReturnType<typeof Markup.button.callback>[][];
} {
  let text = `🔧 <b>Job System Setup</b>\n\n`;
  text += `<b>Step 2/4:</b> Select jobs to enable\n`;
  text += `<i>Tap a job to toggle it on/off, then tap Continue.</i>\n\n`;

  for (const type of ALL_JOB_TYPES) {
    const enabled = state.jobs.has(type);
    const icon = enabled ? "✅" : "⬜";
    text += `${icon} ${JOB_LABELS[type]}\n`;
  }

  const buttons = ALL_JOB_TYPES.map((type) => {
    const enabled = state.jobs.has(type);
    const icon = enabled ? "✅" : "⬜";
    return [
      Markup.button.callback(
        `${icon} ${JOB_LABELS[type]}`,
        `sjobs_toggle_${type}`
      ),
    ];
  });
  buttons.push([Markup.button.callback("▶️ Continue", "sjobs_jobs_done")]);

  return { text, buttons };
}

export function registerSetupJobsCallbacks(
  bot: import("telegraf").Telegraf,
  config: TelegramConfig
): void {
  // Step 1: Enable/Disable
  bot.action("sjobs_enable", async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const state = setupJobsStates.get(chatId);
    if (!state) {
      await ctx.reply(formatError("No setup in progress. Run /setupjobs to start."), {
        parse_mode: "HTML",
      });
      return;
    }

    state.enabled = true;
    const { text, buttons } = showJobSelection(state);

    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(buttons),
      });
    } catch {
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(buttons),
      });
    }
  });

  bot.action("sjobs_disable", async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const state = setupJobsStates.get(chatId);
    if (!state) return;

    // Save disabled state immediately
    const settings = loadSettings(config) || {};
    if (!settings.jobs || typeof settings.jobs !== "object") {
      settings.jobs = {};
    }
    (settings.jobs as Record<string, unknown>).enabled = false;
    saveSettings(config, settings);
    setupJobsStates.delete(chatId);

    try {
      await ctx.editMessageText(
        formatSuccess(
          "Job system <b>disabled</b>. Run /setupjobs again to re-enable."
        ),
        { parse_mode: "HTML" }
      );
    } catch {
      await ctx.reply(
        formatSuccess(
          "Job system <b>disabled</b>. Run /setupjobs again to re-enable."
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // Step 2: Toggle individual jobs
  bot.action(/^sjobs_toggle_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const state = setupJobsStates.get(chatId);
    if (!state) return;

    const jobType = ctx.match[1] as JobType;
    if (state.jobs.has(jobType)) {
      state.jobs.delete(jobType);
    } else {
      state.jobs.add(jobType);
    }

    const { text, buttons } = showJobSelection(state);

    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(buttons),
      });
    } catch {
      // Ignore edit errors (message unchanged)
    }
  });

  // Step 2 → Step 3: Schedule selection
  bot.action("sjobs_jobs_done", async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const state = setupJobsStates.get(chatId);
    if (!state) return;

    let text = `🔧 <b>Job System Setup</b>\n\n`;
    text += `<b>Step 3/4:</b> When should scans run?`;

    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🌙 Nightly (2 AM)", "sjobs_sched_nightly")],
          [
            Markup.button.callback(
              "🔄 Twice daily (2 AM & 2 PM)",
              "sjobs_sched_twice"
            ),
          ],
          [
            Markup.button.callback(
              "📅 Weekly (Sunday 2 AM)",
              "sjobs_sched_weekly"
            ),
          ],
        ]),
      });
    } catch {
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🌙 Nightly (2 AM)", "sjobs_sched_nightly")],
          [
            Markup.button.callback(
              "🔄 Twice daily (2 AM & 2 PM)",
              "sjobs_sched_twice"
            ),
          ],
          [
            Markup.button.callback(
              "📅 Weekly (Sunday 2 AM)",
              "sjobs_sched_weekly"
            ),
          ],
        ]),
      });
    }
  });

  // Step 3: Schedule callbacks
  const scheduleMap: Record<string, { cron: string; label: string }> = {
    sjobs_sched_nightly: { cron: "0 2 * * *", label: "Nightly (2:00 AM)" },
    sjobs_sched_twice: {
      cron: "0 2,14 * * *",
      label: "Twice daily (2 AM & 2 PM)",
    },
    sjobs_sched_weekly: {
      cron: "0 2 * * 0",
      label: "Weekly (Sunday 2:00 AM)",
    },
  };

  for (const [action, sched] of Object.entries(scheduleMap)) {
    bot.action(action, async (ctx) => {
      await ctx.answerCbQuery();
      const chatId = ctx.chat?.id;
      if (!chatId) return;

      const state = setupJobsStates.get(chatId);
      if (!state) return;

      state.schedule = sched.cron;
      state.scheduleLabel = sched.label;

      let text = `🔧 <b>Job System Setup</b>\n\n`;
      text += `<b>Step 4/4:</b> How much autonomy should the agent have?`;

      try {
        await ctx.editMessageText(text, {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "🛡️ Conservative",
                "sjobs_auto_conservative"
              ),
            ],
            [
              Markup.button.callback(
                "⚖️ Balanced (recommended)",
                "sjobs_auto_balanced"
              ),
            ],
            [
              Markup.button.callback(
                "⚡ Aggressive",
                "sjobs_auto_aggressive"
              ),
            ],
          ]),
        });
      } catch {
        await ctx.reply(text, {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "🛡️ Conservative",
                "sjobs_auto_conservative"
              ),
            ],
            [
              Markup.button.callback(
                "⚖️ Balanced (recommended)",
                "sjobs_auto_balanced"
              ),
            ],
            [
              Markup.button.callback(
                "⚡ Aggressive",
                "sjobs_auto_aggressive"
              ),
            ],
          ]),
        });
      }
    });
  }

  // Step 4: Autonomy level callbacks
  const autonomyMap: Record<string, { level: string; label: string }> = {
    sjobs_auto_conservative: { level: "conservative", label: "Conservative" },
    sjobs_auto_balanced: { level: "balanced", label: "Balanced" },
    sjobs_auto_aggressive: { level: "aggressive", label: "Aggressive" },
  };

  for (const [action, auto] of Object.entries(autonomyMap)) {
    bot.action(action, async (ctx) => {
      await ctx.answerCbQuery();
      const chatId = ctx.chat?.id;
      if (!chatId) return;

      const state = setupJobsStates.get(chatId);
      if (!state) return;

      state.autonomyLevel = auto.level;
      state.autonomyLabel = auto.label;

      // Show summary
      const enabledJobs = ALL_JOB_TYPES.filter((t) => state.jobs.has(t))
        .map((t) => JOB_LABELS[t])
        .join(", ");

      let text = `🔧 <b>Job System Setup — Summary</b>\n\n`;
      text += `<b>Status:</b> ✅ Enabled\n`;
      text += `<b>Jobs:</b> ${escapeHtml(enabledJobs || "None")}\n`;
      text += `<b>Schedule:</b> ${escapeHtml(state.scheduleLabel)}\n`;
      text += `<b>Autonomy:</b> ${escapeHtml(state.autonomyLabel)}\n\n`;
      text += `Save this configuration?`;

      try {
        await ctx.editMessageText(text, {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("✅ Save", "sjobs_save"),
              Markup.button.callback("❌ Cancel", "sjobs_cancel"),
            ],
          ]),
        });
      } catch {
        await ctx.reply(text, {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("✅ Save", "sjobs_save"),
              Markup.button.callback("❌ Cancel", "sjobs_cancel"),
            ],
          ]),
        });
      }
    });
  }

  // Save configuration
  bot.action("sjobs_save", async (ctx) => {
    await ctx.answerCbQuery("Saving…");
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const state = setupJobsStates.get(chatId);
    if (!state) {
      await ctx.reply(formatError("No setup in progress. Run /setupjobs to start."), {
        parse_mode: "HTML",
      });
      return;
    }

    try {
      const settings = loadSettings(config) || {};

      const jobConfigs = ALL_JOB_TYPES.map((type) => ({
        type,
        enabled: state.jobs.has(type),
        schedule: {
          cronExpression: state.schedule,
          enabled: state.jobs.has(type),
        },
        severity:
          type === JobType.FLAKY_TEST_DETECTION
            ? JobSeverity.REQUIRE_APPROVAL
            : JobSeverity.AUTO_EXECUTE,
        options: {},
      }));

      settings.jobs = {
        enabled: true,
        schedule: state.schedule,
        configs: jobConfigs,
      };

      settings.autonomy = {
        ...(settings.autonomy as Record<string, unknown> | undefined),
        rules: buildAutonomyRules(state.autonomyLevel),
      };

      saveSettings(config, settings);
      setupJobsStates.delete(chatId);

      try {
        await ctx.editMessageText(
          formatSuccess(
            "Job system configured!\n\n" +
              "Run <code>locus daemon start</code> to begin autonomous maintenance."
          ),
          { parse_mode: "HTML" }
        );
      } catch {
        await ctx.reply(
          formatSuccess(
            "Job system configured!\n\n" +
              "Run <code>locus daemon start</code> to begin autonomous maintenance."
          ),
          { parse_mode: "HTML" }
        );
      }
    } catch (err) {
      await ctx.reply(
        formatError(
          `Failed to save: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // Cancel
  bot.action("sjobs_cancel", async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    setupJobsStates.delete(chatId);

    try {
      await ctx.editMessageText("Setup cancelled. No changes were made.", {
        parse_mode: "HTML",
      });
    } catch {
      await ctx.reply("Setup cancelled. No changes were made.");
    }
  });
}
