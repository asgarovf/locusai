import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { JobSeverity, JobStatus, JobType } from "@locusai/shared";
import type { Context } from "telegraf";
import { getClientAndWorkspace, requireApiKey } from "../api-client.js";
import type { TelegramConfig } from "../config.js";
import type { CliExecutor } from "../executor.js";
import {
  escapeHtml,
  formatError,
  formatRelativeTime,
  formatSuccess,
} from "../formatter.js";

// ── Display names (mirrored from CLI) ───────────────────────────────────

const JOB_DISPLAY_NAMES: Record<string, string> = {
  [JobType.LINT_SCAN]: "Lint Scan",
  [JobType.DEPENDENCY_CHECK]: "Dependency Check",
  [JobType.TODO_CLEANUP]: "TODO Cleanup",
  [JobType.FLAKY_TEST_DETECTION]: "Flaky Test Detection",
  [JobType.CUSTOM]: "Custom",
};

function formatJobType(type: string): string {
  return JOB_DISPLAY_NAMES[type] ?? type;
}

// ── Job type aliases (for /runjob shorthand) ────────────────────────────

const JOB_TYPE_ALIASES: Record<string, string> = {
  lint: JobType.LINT_SCAN,
  dependency: JobType.DEPENDENCY_CHECK,
  todo: JobType.TODO_CLEANUP,
  test: JobType.FLAKY_TEST_DETECTION,
};

function resolveJobType(input: string): string | undefined {
  const lower = input.toLowerCase();
  return JOB_TYPE_ALIASES[lower] ?? (Object.values(JobType).includes(input as JobType) ? input : undefined);
}

// ── Status icons ────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, string> = {
  [JobStatus.IDLE]: "⏸",
  [JobStatus.RUNNING]: "🔄",
  [JobStatus.COMPLETED]: "✅",
  [JobStatus.FAILED]: "❌",
  [JobStatus.CANCELLED]: "🚫",
};

// ── Default configs (mirrored from SettingsManager) ─────────────────────

const DEFAULT_SCHEDULE = "0 2 * * *";

interface SettingsJobConfig {
  type: string;
  enabled?: boolean;
  severity?: string;
  schedule?: {
    cronExpression?: string;
    enabled?: boolean;
  };
}

interface JobDisplayConfig {
  type: string;
  enabled: boolean;
  severity: string;
  cronExpression: string;
}

const DEFAULT_JOB_CONFIGS: JobDisplayConfig[] = [
  {
    type: JobType.LINT_SCAN,
    enabled: true,
    severity: JobSeverity.AUTO_EXECUTE,
    cronExpression: DEFAULT_SCHEDULE,
  },
  {
    type: JobType.DEPENDENCY_CHECK,
    enabled: true,
    severity: JobSeverity.AUTO_EXECUTE,
    cronExpression: DEFAULT_SCHEDULE,
  },
  {
    type: JobType.TODO_CLEANUP,
    enabled: true,
    severity: JobSeverity.AUTO_EXECUTE,
    cronExpression: DEFAULT_SCHEDULE,
  },
  {
    type: JobType.FLAKY_TEST_DETECTION,
    enabled: true,
    severity: JobSeverity.REQUIRE_APPROVAL,
    cronExpression: DEFAULT_SCHEDULE,
  },
];

function loadJobConfigs(projectPath: string): JobDisplayConfig[] {
  const settingsPath = join(projectPath, ".locus", "settings.json");

  let userConfigs: SettingsJobConfig[] = [];
  let globalSchedule = DEFAULT_SCHEDULE;

  if (existsSync(settingsPath)) {
    try {
      const raw = JSON.parse(readFileSync(settingsPath, "utf-8"));
      userConfigs = raw?.jobs?.configs ?? [];
      globalSchedule = raw?.jobs?.schedule ?? DEFAULT_SCHEDULE;
    } catch {
      // Ignore parse errors, use defaults
    }
  }

  return DEFAULT_JOB_CONFIGS.map((def) => {
    const override = userConfigs.find((c) => c.type === def.type);
    if (!override) {
      return { ...def, cronExpression: globalSchedule };
    }
    return {
      type: def.type,
      enabled: override.enabled ?? def.enabled,
      severity: override.severity ?? def.severity,
      cronExpression:
        override.schedule?.cronExpression ?? globalSchedule,
    };
  });
}

// ============================================================================
// /jobs — List all configured jobs
// ============================================================================

export async function jobsCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[jobs] Listing configured jobs");

  const configs = loadJobConfigs(config.projectPath);

  let msg = "🔧 <b>Configured Jobs</b>\n\n";

  for (const job of configs) {
    const enabledIcon = job.enabled ? "🟢" : "🔴";
    const enabledText = job.enabled ? "enabled" : "disabled";
    const severityText =
      job.severity === JobSeverity.AUTO_EXECUTE
        ? "auto-execute"
        : "require approval";

    msg += `${enabledIcon} <b>${escapeHtml(formatJobType(job.type))}</b>\n`;
    msg += `   Status: ${enabledText} · Severity: ${severityText}\n`;
    msg += `   Schedule: <code>${escapeHtml(job.cronExpression)}</code>\n\n`;
  }

  msg += `<i>Use /runjob &lt;type&gt; to trigger a job manually.</i>\n`;
  msg += `<i>Types: lint, dependency, todo, test</i>`;

  await ctx.reply(msg, { parse_mode: "HTML" });
}

// ============================================================================
// /runjob <type> — Manually trigger a job
// ============================================================================

export async function runJobCommand(
  ctx: Context,
  executor: CliExecutor
): Promise<void> {
  const text = (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const args = text.split(/\s+/).slice(1);
  const typeArg = args[0];

  if (!typeArg) {
    await ctx.reply(
      formatError(
        "Usage: /runjob <type>\nAvailable types: lint, dependency, todo, test"
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  const jobType = resolveJobType(typeArg);
  if (!jobType) {
    await ctx.reply(
      formatError(
        `Unknown job type: ${typeArg}\nAvailable types: lint, dependency, todo, test`
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  const jobName = formatJobType(jobType);
  console.log(`[runjob] Triggering job: ${jobType}`);

  await ctx.reply(`🔄 <b>Triggering:</b> ${escapeHtml(jobName)}…`, {
    parse_mode: "HTML",
  });

  // Resolve the CLI alias for the job type
  const cliAlias =
    Object.entries(JOB_TYPE_ALIASES).find(([, v]) => v === jobType)?.[0] ??
    jobType.toLowerCase();

  const cliArgs = executor.buildArgs(["jobs", "run", cliAlias], {
    needsApiKey: true,
  });

  try {
    const result = await executor.execute(cliArgs);
    const output = (result.stdout + result.stderr).trim();

    if (result.exitCode === 0) {
      await ctx.reply(
        formatSuccess(`${jobName} completed.\n\n<pre>${escapeHtml(output.slice(0, 3000))}</pre>`),
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(
        formatError(
          `${jobName} failed (exit code ${result.exitCode}).\n\n<pre>${escapeHtml(output.slice(0, 3000))}</pre>`
        ),
        { parse_mode: "HTML" }
      );
    }
  } catch (err) {
    console.error("[runjob] Execution failed:", err);
    await ctx.reply(
      formatError(
        `Failed to run job: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

// ============================================================================
// /jobhistory — Show recent job run history
// ============================================================================

export async function jobHistoryCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[jobhistory] Fetching job run history");

  if (!(await requireApiKey(ctx, config, "jobhistory"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);
    const jobRuns = await client.jobs.list(workspaceId, { limit: 10 });

    if (jobRuns.length === 0) {
      await ctx.reply("📜 <b>Job History</b>\n\n<i>No job runs found.</i>", {
        parse_mode: "HTML",
      });
      return;
    }

    let msg = "📜 <b>Job History</b> (last 10 runs)\n\n";

    for (const run of jobRuns) {
      const icon = STATUS_ICONS[run.status] || "•";
      const jobName = formatJobType(run.jobType);
      const startedAt = formatRelativeTime(run.startedAt);

      msg += `${icon} <b>${escapeHtml(jobName)}</b> — ${run.status}\n`;
      msg += `   Started: ${startedAt}`;

      if (run.completedAt) {
        msg += ` · Completed: ${formatRelativeTime(run.completedAt)}`;
      }
      msg += "\n";

      if (run.result) {
        msg += `   ${escapeHtml(run.result.summary.slice(0, 100))}`;
        if (run.result.summary.length > 100) msg += "…";
        msg += "\n";
      }

      msg += "\n";
    }

    await ctx.reply(msg, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error("[jobhistory] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to fetch job history: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}
