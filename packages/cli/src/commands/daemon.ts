import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  c,
  createDefaultRegistry,
  type JobCompletedPayload,
  JobEvent,
  type JobFailedPayload,
  JobRunner,
  type JobScheduledPayload,
  JobScheduler,
  type JobSkippedPayload,
  type JobStartedPayload,
  type JobTriggeredPayload,
  LOCUS_CONFIG,
  LocusClient,
  ProposalEngine,
  type ProposalsGeneratedPayload,
  SchedulerEvent,
  type SchedulerStartedPayload,
} from "@locusai/sdk/node";
import { createNotifier } from "@locusai/telegram";
import { SettingsManager } from "../settings-manager";
import { requireInitialization } from "../utils";
import { WorkspaceResolver } from "../workspace-resolver";

// ============================================================================
// PID file helpers
// ============================================================================

function getPidFilePath(projectPath: string): string {
  return join(projectPath, LOCUS_CONFIG.dir, "daemon.pid");
}

function writePidFile(projectPath: string): void {
  writeFileSync(getPidFilePath(projectPath), String(process.pid), "utf-8");
}

function removePidFile(projectPath: string): void {
  const pidFile = getPidFilePath(projectPath);
  if (existsSync(pidFile)) {
    unlinkSync(pidFile);
  }
}

function readPidFile(projectPath: string): number | null {
  const pidFile = getPidFilePath(projectPath);
  if (!existsSync(pidFile)) return null;
  const pid = Number.parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
  return Number.isNaN(pid) ? null : pid;
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Job display names (mirrored from jobs.ts)
// ============================================================================

const JOB_DISPLAY_NAMES: Record<string, string> = {
  LINT_SCAN: "Lint Scan",
  DEPENDENCY_CHECK: "Dependency Check",
  TODO_CLEANUP: "TODO Cleanup",
  FLAKY_TEST_DETECTION: "Flaky Test Detection",
  CUSTOM: "Custom",
};

function formatJobType(type: string): string {
  return JOB_DISPLAY_NAMES[type] ?? type;
}

// ============================================================================
// Help
// ============================================================================

function showDaemonHelp(): void {
  console.log(`
  ${c.header(" DAEMON ")}
    ${c.primary("locus daemon")} ${c.dim("<subcommand> [options]")}

  ${c.header(" SUBCOMMANDS ")}
    ${c.success("start")}              Start the scheduling daemon (foreground)
                        ${c.dim("--api-key <key>    API key override")}
                        ${c.dim("--api-url <url>    API base URL override")}
                        ${c.dim("--workspace <id>   Workspace ID override")}
    ${c.success("status")}             Check if the daemon is running
    ${c.success("stop")}               Stop the running daemon

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus daemon start")}
    ${c.dim("$")} ${c.primary("locus daemon status")}
    ${c.dim("$")} ${c.primary("locus daemon stop")}
`);
}

// ============================================================================
// start
// ============================================================================

async function startCommand(
  args: string[],
  projectPath: string
): Promise<void> {
  // Check for an existing daemon
  const existingPid = readPidFile(projectPath);
  if (existingPid && isProcessRunning(existingPid)) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Daemon is already running")} ${c.dim(`(PID ${existingPid})`)}\n`
    );
    console.error(
      `  ${c.dim("Use")} ${c.primary("locus daemon stop")} ${c.dim("to stop it first.")}\n`
    );
    process.exit(1);
  }

  const { values } = parseArgs({
    args,
    options: {
      "api-key": { type: "string" },
      "api-url": { type: "string" },
      workspace: { type: "string" },
    },
    strict: false,
    allowPositionals: true,
  });

  const settingsManager = new SettingsManager(projectPath);
  const settings = settingsManager.load();

  const apiKey = (values["api-key"] as string) || settings.apiKey;
  if (!apiKey) {
    console.error(
      `\n  ${c.error("✖")} ${c.red("API key is required to start the daemon")}\n`
    );
    console.error(
      `  ${c.dim("Configure with: locus config setup --api-key <key>")}\n`
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
    workspaceId: (values.workspace as string) || settings.workspaceId,
  });
  const workspaceId = await resolver.resolve();

  const client = new LocusClient({
    baseUrl: apiBase,
    token: apiKey,
  });

  const registry = createDefaultRegistry();
  const runner = new JobRunner(registry, client, projectPath, workspaceId);

  // ---- Proposal engine ----
  const proposalEngine = new ProposalEngine();

  const scheduler = new JobScheduler(
    runner,
    () => ({
      jobConfigs: settingsManager.getJobConfigs(),
      autonomyRules: settingsManager.getAutonomyRules(),
    }),
    client.emitter,
    {
      engine: proposalEngine,
      projectPath,
      client,
      workspaceId,
    }
  );

  // ---- Telegram notifier (optional) ----
  const telegramSettings = settings.telegram;
  let telegramEnabled = false;

  if (telegramSettings?.botToken && telegramSettings?.chatId) {
    try {
      const notifier = createNotifier(
        telegramSettings.botToken,
        telegramSettings.chatId
      );
      notifier.connect(client.emitter);
      telegramEnabled = true;
      console.log(
        `  ${c.success("✔")} ${c.bold("Telegram notifications enabled")} ${c.dim(`(chat ${telegramSettings.chatId})`)}`
      );
    } catch (err) {
      console.error(
        `  ${c.error("✖")} Failed to initialize Telegram notifier: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else {
    console.log(
      `  ${c.dim("Telegram not configured — using console logging only")}`
    );
  }

  // ---- Event listeners for console logging ----

  client.emitter.on(
    SchedulerEvent.SCHEDULER_STARTED,
    (payload: SchedulerStartedPayload) => {
      console.log(
        `\n  ${c.success("✔")} ${c.bold("Scheduler started")} — ${payload.jobCount} job(s) scheduled\n`
      );
    }
  );

  client.emitter.on(
    SchedulerEvent.JOB_SCHEDULED,
    (payload: JobScheduledPayload) => {
      console.log(
        `  ${c.info("●")} ${c.bold(formatJobType(payload.jobType))} → ${c.dim(payload.cronExpression)}`
      );
    }
  );

  client.emitter.on(
    SchedulerEvent.JOB_TRIGGERED,
    (payload: JobTriggeredPayload) => {
      const ts = new Date().toLocaleTimeString();
      console.log(
        `\n  ${c.info("▶")} ${c.bold(formatJobType(payload.jobType))} triggered ${c.dim(`at ${ts}`)}`
      );
    }
  );

  client.emitter.on(
    SchedulerEvent.JOB_SKIPPED,
    (payload: JobSkippedPayload) => {
      const ts = new Date().toLocaleTimeString();
      console.log(
        `  ${c.secondary("⏭")} ${c.bold(formatJobType(payload.jobType))} skipped ${c.dim(`at ${ts}`)} — ${c.dim(payload.reason)}`
      );
    }
  );

  client.emitter.on(JobEvent.JOB_STARTED, (payload: JobStartedPayload) => {
    console.log(
      `  ${c.info("●")} ${formatJobType(payload.jobType)} running... ${c.dim(`(run ${payload.jobRunId})`)}`
    );
  });

  client.emitter.on(JobEvent.JOB_COMPLETED, (payload: JobCompletedPayload) => {
    console.log(
      `  ${c.success("✔")} ${formatJobType(payload.jobType)} completed — ${payload.result.summary}`
    );
  });

  client.emitter.on(JobEvent.JOB_FAILED, (payload: JobFailedPayload) => {
    console.log(
      `  ${c.error("✖")} ${formatJobType(payload.jobType)} failed — ${payload.error}`
    );
  });

  client.emitter.on(
    SchedulerEvent.PROPOSALS_GENERATED,
    (payload: ProposalsGeneratedPayload) => {
      const count = payload.suggestions.length;
      console.log(
        `  ${c.info("💡")} ${c.bold(`${count} proposal(s) generated`)}`
      );
      for (const suggestion of payload.suggestions) {
        console.log(`    ${c.dim("•")} ${suggestion.title}`);
      }
    }
  );

  // ---- Write PID file ----
  writePidFile(projectPath);

  // ---- Graceful shutdown ----
  let shuttingDown = false;

  function shutdown(signal: string): void {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(
      `\n  ${c.dim(`Received ${signal}. Shutting down scheduler...`)}`
    );
    scheduler.stop();
    removePidFile(projectPath);
    console.log(`  ${c.success("✔")} ${c.bold("Daemon stopped.")}\n`);
    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Clean up PID file on unexpected exit
  process.on("exit", () => {
    removePidFile(projectPath);
  });

  // ---- Start the scheduler ----
  console.log(`\n  ${c.header(" LOCUS DAEMON ")}`);
  console.log(`  ${c.dim("PID:")} ${process.pid}`);
  console.log(`  ${c.dim("Project:")} ${projectPath}`);
  console.log(`  ${c.dim("Workspace:")} ${workspaceId}`);
  console.log(
    `  ${c.dim("Telegram:")} ${telegramEnabled ? "enabled" : "not configured"}`
  );
  console.log(`  ${c.dim("Proposals:")} enabled`);

  scheduler.start();

  const jobs = scheduler.getScheduledJobs();
  if (jobs.length === 0) {
    console.log(
      `\n  ${c.secondary("⚠")} ${c.bold("No jobs are enabled or scheduled.")}`
    );
    console.log(
      `  ${c.dim("Enable jobs with:")} ${c.primary("locus jobs enable <type>")}\n`
    );
  }

  console.log(`\n  ${c.dim("Press Ctrl+C to stop the daemon.")}\n`);

  // Keep the process alive
  await new Promise<void>(() => {
    // This promise never resolves — the process stays alive
    // until SIGINT/SIGTERM triggers shutdown()
  });
}

// ============================================================================
// status
// ============================================================================

function statusCommand(projectPath: string): void {
  const pid = readPidFile(projectPath);

  if (!pid) {
    console.log(`\n  ${c.secondary("●")} ${c.bold("Daemon is not running")}\n`);
    console.log(
      `  ${c.dim("Start with:")} ${c.primary("locus daemon start")}\n`
    );
    return;
  }

  if (isProcessRunning(pid)) {
    console.log(
      `\n  ${c.success("●")} ${c.bold("Daemon is running")} ${c.dim(`(PID ${pid})`)}\n`
    );
  } else {
    // Stale PID file — process is not running
    removePidFile(projectPath);
    console.log(
      `\n  ${c.secondary("●")} ${c.bold("Daemon is not running")} ${c.dim("(stale PID file removed)")}\n`
    );
    console.log(
      `  ${c.dim("Start with:")} ${c.primary("locus daemon start")}\n`
    );
  }
}

// ============================================================================
// stop
// ============================================================================

function stopCommand(projectPath: string): void {
  const pid = readPidFile(projectPath);

  if (!pid) {
    console.log(`\n  ${c.secondary("●")} ${c.bold("No daemon is running")}\n`);
    return;
  }

  if (!isProcessRunning(pid)) {
    removePidFile(projectPath);
    console.log(
      `\n  ${c.secondary("●")} ${c.bold("Daemon is not running")} ${c.dim("(stale PID file removed)")}\n`
    );
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
    console.log(
      `\n  ${c.success("✔")} ${c.bold("Sent SIGTERM to daemon")} ${c.dim(`(PID ${pid})`)}\n`
    );
  } catch (err) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Failed to stop daemon:")} ${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exit(1);
  }
}

// ============================================================================
// Entry point
// ============================================================================

export async function daemonCommand(args: string[]): Promise<void> {
  const projectPath = process.cwd();
  requireInitialization(projectPath, "daemon");

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "start":
      await startCommand(subArgs, projectPath);
      break;
    case "status":
      statusCommand(projectPath);
      break;
    case "stop":
      stopCommand(projectPath);
      break;
    default:
      showDaemonHelp();
  }
}
