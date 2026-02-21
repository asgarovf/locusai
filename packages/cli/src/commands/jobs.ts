import { parseArgs } from "node:util";
import {
  c,
  createDefaultRegistry,
  JobRunner,
  LocusClient,
} from "@locusai/sdk/node";
import { JobSeverity, JobType } from "@locusai/shared";
import { SettingsManager } from "../settings-manager";
import { requireInitialization } from "../utils";
import { WorkspaceResolver } from "../workspace-resolver";

// ============================================================================
// Type aliases for user-friendly input
// ============================================================================

const JOB_TYPE_ALIASES: Record<string, JobType> = {
  lint: JobType.LINT_SCAN,
  dependency: JobType.DEPENDENCY_CHECK,
  todo: JobType.TODO_CLEANUP,
  test: JobType.FLAKY_TEST_DETECTION,
  // Allow exact enum values too
  [JobType.LINT_SCAN]: JobType.LINT_SCAN,
  [JobType.DEPENDENCY_CHECK]: JobType.DEPENDENCY_CHECK,
  [JobType.TODO_CLEANUP]: JobType.TODO_CLEANUP,
  [JobType.FLAKY_TEST_DETECTION]: JobType.FLAKY_TEST_DETECTION,
};

const JOB_DISPLAY_NAMES: Record<JobType, string> = {
  [JobType.LINT_SCAN]: "Lint Scan",
  [JobType.DEPENDENCY_CHECK]: "Dependency Check",
  [JobType.TODO_CLEANUP]: "TODO Cleanup",
  [JobType.FLAKY_TEST_DETECTION]: "Flaky Test Detection",
  [JobType.CUSTOM]: "Custom",
};

function resolveJobType(input: string): JobType | undefined {
  return JOB_TYPE_ALIASES[input.toLowerCase()] ?? JOB_TYPE_ALIASES[input];
}

function formatJobType(type: JobType): string {
  return JOB_DISPLAY_NAMES[type] ?? type;
}

// ============================================================================
// Help
// ============================================================================

function showJobsHelp(): void {
  console.log(`
  ${c.header(" JOBS ")}
    ${c.primary("locus jobs")} ${c.dim("<subcommand> [options]")}

  ${c.header(" SUBCOMMANDS ")}
    ${c.success("list")}               Show all registered jobs with status and schedule
    ${c.success("run")} ${c.dim("[type]")}          Run a specific job or all enabled jobs
                        ${c.dim("Types: lint, dependency, todo, test")}
    ${c.success("enable")} ${c.dim("<type>")}       Enable a specific job type
    ${c.success("disable")} ${c.dim("<type>")}      Disable a specific job type
    ${c.success("config")} ${c.dim("<type>")}       Show/edit config for a job type
                        ${c.dim("--cron <expr>     Set cron schedule")}
                        ${c.dim("--severity <lvl>  Set severity (auto_execute, require_approval)")}

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus jobs list")}
    ${c.dim("$")} ${c.primary("locus jobs run lint")}
    ${c.dim("$")} ${c.primary("locus jobs run")}
    ${c.dim("$")} ${c.primary("locus jobs enable test")}
    ${c.dim("$")} ${c.primary("locus jobs disable todo")}
    ${c.dim("$")} ${c.primary('locus jobs config lint --cron "0 3 * * *"')}
    ${c.dim("$")} ${c.primary("locus jobs config test --severity require_approval")}
`);
}

// ============================================================================
// list
// ============================================================================

function listCommand(projectPath: string): void {
  const settingsManager = new SettingsManager(projectPath);
  const configs = settingsManager.getJobConfigs();

  console.log(`\n  ${c.header(" REGISTERED JOBS ")}\n`);

  // Table header
  const typeCol = "Type".padEnd(24);
  const statusCol = "Status".padEnd(12);
  const severityCol = "Severity".padEnd(20);
  const scheduleCol = "Schedule";
  console.log(
    `  ${c.bold(typeCol)} ${c.bold(statusCol)} ${c.bold(severityCol)} ${c.bold(scheduleCol)}`
  );
  console.log(`  ${c.dim("─".repeat(72))}`);

  for (const config of configs) {
    const name = formatJobType(config.type).padEnd(24);
    const enabled = config.enabled
      ? c.success("enabled".padEnd(12))
      : c.error("disabled".padEnd(12));
    const severity =
      config.severity === JobSeverity.AUTO_EXECUTE
        ? c.primary("auto_execute".padEnd(20))
        : c.secondary("require_approval".padEnd(20));
    const schedule = c.dim(config.schedule.cronExpression);

    console.log(`  ${name} ${enabled} ${severity} ${schedule}`);
  }

  console.log("");
}

// ============================================================================
// run
// ============================================================================

async function runJobsCommand(
  args: string[],
  projectPath: string
): Promise<void> {
  const { values, positionals } = parseArgs({
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
      `\n  ${c.error("✖")} ${c.red("API key is required to run jobs")}\n`
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
  const configs = settingsManager.getJobConfigs();
  const autonomyRules = settingsManager.getAutonomyRules();

  const typeArg = positionals[0];

  if (typeArg) {
    // Run a single job
    const jobType = resolveJobType(typeArg);
    if (!jobType) {
      console.error(
        `\n  ${c.error("✖")} ${c.bold(`Unknown job type: ${typeArg}`)}\n`
      );
      console.error(
        `  ${c.dim("Available types: lint, dependency, todo, test")}\n`
      );
      process.exit(1);
    }

    const config = configs.find((cfg) => cfg.type === jobType);
    if (!config) {
      console.error(
        `\n  ${c.error("✖")} ${c.bold(`No config found for job: ${formatJobType(jobType)}`)}\n`
      );
      process.exit(1);
    }

    console.log(
      `\n  ${c.info("●")} ${c.bold("Running:")} ${formatJobType(jobType)}...\n`
    );

    try {
      const result = await runner.runJob(jobType, config, autonomyRules);
      console.log(`  ${c.success("✔")} ${c.bold("Completed:")}`);
      console.log(`    ${c.dim("Summary:")} ${result.summary}`);
      console.log(`    ${c.dim("Files changed:")} ${result.filesChanged}`);
      if (result.suggestions.length > 0) {
        console.log(
          `    ${c.dim("Suggestions:")} ${result.suggestions.length}`
        );
      }
      if (result.prUrl) {
        console.log(`    ${c.dim("PR:")} ${c.underline(result.prUrl)}`);
      }
      if (result.errors?.length) {
        for (const error of result.errors) {
          console.log(`    ${c.error("⚠")} ${error}`);
        }
      }
    } catch (err) {
      console.error(
        `  ${c.error("✖")} ${c.bold("Failed:")} ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  } else {
    // Run all enabled jobs
    console.log(
      `\n  ${c.info("●")} ${c.bold("Running all enabled jobs...")}\n`
    );

    const results = await runner.runAllEnabled(configs, autonomyRules);

    if (results.size === 0) {
      console.log(`  ${c.dim("No enabled jobs to run.")}\n`);
      return;
    }

    for (const [jobType, result] of results) {
      console.log(`  ${c.success("✔")} ${c.bold(formatJobType(jobType))}`);
      console.log(`    ${c.dim("Summary:")} ${result.summary}`);
      console.log(`    ${c.dim("Files changed:")} ${result.filesChanged}`);
      if (result.suggestions.length > 0) {
        console.log(
          `    ${c.dim("Suggestions:")} ${result.suggestions.length}`
        );
      }
      if (result.prUrl) {
        console.log(`    ${c.dim("PR:")} ${c.underline(result.prUrl)}`);
      }
      console.log("");
    }

    console.log(
      `  ${c.success("✔")} ${c.bold(`${results.size} job(s) completed.`)}\n`
    );
  }
}

// ============================================================================
// enable / disable
// ============================================================================

function toggleJobCommand(
  args: string[],
  projectPath: string,
  enable: boolean
): void {
  const typeArg = args[0];
  if (!typeArg) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold(`Usage: locus jobs ${enable ? "enable" : "disable"} <type>`)}\n`
    );
    console.error(
      `  ${c.dim("Available types: lint, dependency, todo, test")}\n`
    );
    process.exit(1);
  }

  const jobType = resolveJobType(typeArg);
  if (!jobType) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold(`Unknown job type: ${typeArg}`)}\n`
    );
    console.error(
      `  ${c.dim("Available types: lint, dependency, todo, test")}\n`
    );
    process.exit(1);
  }

  const settingsManager = new SettingsManager(projectPath);
  const settings = settingsManager.load();

  if (!settings.jobs) {
    settings.jobs = { enabled: true };
  }
  if (!settings.jobs.configs) {
    settings.jobs.configs = [];
  }

  const existing = settings.jobs.configs.find((cfg) => cfg.type === jobType);
  if (existing) {
    existing.enabled = enable;
  } else {
    settings.jobs.configs.push({ type: jobType, enabled: enable });
  }

  settingsManager.save(settings);

  const action = enable ? "enabled" : "disabled";
  console.log(
    `\n  ${c.success("✔")} ${c.bold(formatJobType(jobType))} ${action}\n`
  );
}

// ============================================================================
// config
// ============================================================================

function configJobCommand(args: string[], projectPath: string): void {
  const { values, positionals } = parseArgs({
    args,
    options: {
      cron: { type: "string" },
      severity: { type: "string" },
    },
    strict: false,
    allowPositionals: true,
  });

  const typeArg = positionals[0];
  if (!typeArg) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Usage: locus jobs config <type> [--cron <expr>] [--severity <level>]")}\n`
    );
    console.error(
      `  ${c.dim("Available types: lint, dependency, todo, test")}\n`
    );
    process.exit(1);
  }

  const jobType = resolveJobType(typeArg);
  if (!jobType) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold(`Unknown job type: ${typeArg}`)}\n`
    );
    console.error(
      `  ${c.dim("Available types: lint, dependency, todo, test")}\n`
    );
    process.exit(1);
  }

  const cronValue = values.cron as string | undefined;
  const severityValue = values.severity as string | undefined;

  const settingsManager = new SettingsManager(projectPath);

  // If flags are provided, update config
  if (cronValue || severityValue) {
    const settings = settingsManager.load();

    if (!settings.jobs) {
      settings.jobs = { enabled: true };
    }
    if (!settings.jobs.configs) {
      settings.jobs.configs = [];
    }

    let existing = settings.jobs.configs.find((cfg) => cfg.type === jobType);
    if (!existing) {
      existing = { type: jobType };
      settings.jobs.configs.push(existing);
    }

    if (cronValue) {
      existing.schedule = {
        ...existing.schedule,
        cronExpression: cronValue,
        enabled: existing.schedule?.enabled ?? true,
      };
    }

    if (severityValue) {
      const normalized = severityValue.toUpperCase();
      if (
        normalized !== JobSeverity.AUTO_EXECUTE &&
        normalized !== JobSeverity.REQUIRE_APPROVAL
      ) {
        console.error(
          `\n  ${c.error("✖")} ${c.bold(`Invalid severity: ${severityValue}`)}\n`
        );
        console.error(
          `  ${c.dim("Valid values: auto_execute, require_approval")}\n`
        );
        process.exit(1);
      }
      existing.severity = normalized as JobSeverity;
    }

    settingsManager.save(settings);
    console.log(
      `\n  ${c.success("✔")} ${c.bold(formatJobType(jobType))} config updated\n`
    );
  }

  // Display current config
  const configs = settingsManager.getJobConfigs();
  const config = configs.find((cfg) => cfg.type === jobType);

  if (!config) {
    console.log(
      `\n  ${c.dim("No config found for")} ${formatJobType(jobType)}\n`
    );
    return;
  }

  console.log(`  ${c.header(` ${formatJobType(jobType).toUpperCase()} `)}\n`);
  console.log(`    ${c.primary("Type:")}      ${config.type}`);
  console.log(
    `    ${c.primary("Enabled:")}   ${config.enabled ? c.success("yes") : c.error("no")}`
  );
  console.log(
    `    ${c.primary("Severity:")}  ${config.severity === JobSeverity.AUTO_EXECUTE ? c.primary("auto_execute") : c.secondary("require_approval")}`
  );
  console.log(
    `    ${c.primary("Schedule:")}  ${config.schedule.cronExpression}`
  );
  console.log(
    `    ${c.primary("Scheduled:")} ${config.schedule.enabled ? c.success("yes") : c.error("no")}`
  );
  console.log("");
}

// ============================================================================
// Entry point
// ============================================================================

export async function jobsCommand(args: string[]): Promise<void> {
  const projectPath = process.cwd();
  requireInitialization(projectPath, "jobs");

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "list":
      listCommand(projectPath);
      break;
    case "run":
      await runJobsCommand(subArgs, projectPath);
      break;
    case "enable":
      toggleJobCommand(subArgs, projectPath, true);
      break;
    case "disable":
      toggleJobCommand(subArgs, projectPath, false);
      break;
    case "config":
      configJobCommand(subArgs, projectPath);
      break;
    default:
      showJobsHelp();
  }
}
