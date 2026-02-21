import { createInterface } from "node:readline";
import { c } from "@locusai/sdk/node";
import {
  ChangeCategory,
  type AutonomyRule,
  JobSeverity,
  JobType,
  RiskLevel,
} from "@locusai/shared";
import { SettingsManager } from "../settings-manager";
import { requireInitialization } from "../utils";

function ask(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

const JOB_LABELS: Record<string, string> = {
  [JobType.LINT_SCAN]: "Linting scan",
  [JobType.DEPENDENCY_CHECK]: "Dependency check",
  [JobType.TODO_CLEANUP]: "TODO cleanup",
  [JobType.FLAKY_TEST_DETECTION]: "Flaky test detection",
};

const SCHEDULE_OPTIONS: Record<string, { label: string; cron: string }> = {
  "1": { label: "Nightly (2:00 AM)", cron: "0 2 * * *" },
  "2": { label: "Twice daily (2:00 AM & 2:00 PM)", cron: "0 2,14 * * *" },
  "3": { label: "Weekly (Sunday 2:00 AM)", cron: "0 2 * * 0" },
  "4": { label: "Custom cron expression", cron: "" },
};

type AutonomyLevel = "conservative" | "balanced" | "aggressive";

const AUTONOMY_OPTIONS: Record<
  string,
  { label: string; level: AutonomyLevel; description: string }
> = {
  "1": {
    label: "Conservative",
    level: "conservative",
    description: "Only report issues, never auto-fix",
  },
  "2": {
    label: "Balanced (recommended)",
    level: "balanced",
    description:
      "Auto-fix low-risk issues (lint, patches), require approval for others",
  },
  "3": {
    label: "Aggressive",
    level: "aggressive",
    description: "Auto-fix everything except features and architecture",
  },
};

function buildAutonomyRules(level: AutonomyLevel): AutonomyRule[] {
  switch (level) {
    case "conservative":
      return Object.values(ChangeCategory).map((category) => ({
        category,
        riskLevel: RiskLevel.HIGH,
        autoExecute: false,
      }));

    case "balanced":
      return [
        {
          category: ChangeCategory.FIX,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.REFACTOR,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.STYLE,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.DEPENDENCY,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.FEATURE,
          riskLevel: RiskLevel.HIGH,
          autoExecute: false,
        },
        {
          category: ChangeCategory.ARCHITECTURE,
          riskLevel: RiskLevel.HIGH,
          autoExecute: false,
        },
        {
          category: ChangeCategory.DATABASE,
          riskLevel: RiskLevel.HIGH,
          autoExecute: false,
        },
        {
          category: ChangeCategory.AUTH,
          riskLevel: RiskLevel.HIGH,
          autoExecute: false,
        },
        {
          category: ChangeCategory.API,
          riskLevel: RiskLevel.HIGH,
          autoExecute: false,
        },
      ];

    case "aggressive":
      return [
        {
          category: ChangeCategory.FIX,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.REFACTOR,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.STYLE,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.DEPENDENCY,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.DATABASE,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.AUTH,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.API,
          riskLevel: RiskLevel.LOW,
          autoExecute: true,
        },
        {
          category: ChangeCategory.FEATURE,
          riskLevel: RiskLevel.HIGH,
          autoExecute: false,
        },
        {
          category: ChangeCategory.ARCHITECTURE,
          riskLevel: RiskLevel.HIGH,
          autoExecute: false,
        },
      ];
  }
}

function getAutonomyLabel(level: AutonomyLevel): string {
  for (const opt of Object.values(AUTONOMY_OPTIONS)) {
    if (opt.level === level) return opt.label;
  }
  return level;
}

export async function setupJobsCommand(_args: string[]): Promise<void> {
  const projectPath = process.cwd();
  requireInitialization(projectPath, "setup-jobs");

  const manager = new SettingsManager(projectPath);
  const existing = manager.load();

  // ── Welcome ─────────────────────────────────────────────────────────
  console.log(`
  ${c.header(" JOB SYSTEM SETUP ")}

  ${c.bold("Configure your always-on AI engineering partner.")}
  ${c.dim("This wizard helps you set up autonomous code health maintenance.")}
  ${c.dim("Press Enter to accept defaults shown in parentheses.")}
`);

  // ── Step 1: Master toggle ───────────────────────────────────────────
  console.log(`  ${c.primary("Step 1/5")} ${c.bold("Master Toggle")}`);
  const currentEnabled = existing.jobs?.enabled !== false;
  const enableInput = await ask(
    `  Enable autonomous code health maintenance? ${c.dim(`(${currentEnabled ? "Y/n" : "y/N"})`)} `
  );
  const enabled =
    enableInput === ""
      ? currentEnabled
      : enableInput.toLowerCase().startsWith("y");
  console.log(
    `  ${enabled ? c.success("✔ Enabled") : c.dim("✖ Disabled")}\n`
  );

  if (!enabled) {
    const settings = { ...existing, jobs: { ...existing.jobs, enabled: false } };
    manager.save(settings);
    console.log(`  ${c.success("✔")} ${c.bold("Configuration saved.")}`);
    console.log(`  ${c.dim("Job system is disabled. Run this wizard again to enable it.")}\n`);
    return;
  }

  // ── Step 2: Select jobs ─────────────────────────────────────────────
  console.log(`  ${c.primary("Step 2/5")} ${c.bold("Select Jobs")}`);
  console.log(
    `  ${c.dim("Choose which maintenance jobs to enable. Enter numbers separated by commas.")}`
  );
  console.log(`  ${c.dim("Press Enter to enable all.")}\n`);

  const jobTypes = [
    JobType.LINT_SCAN,
    JobType.DEPENDENCY_CHECK,
    JobType.TODO_CLEANUP,
    JobType.FLAKY_TEST_DETECTION,
  ];

  // Determine current enabled state per job
  const currentJobStates = jobTypes.map((type) => {
    const userConfig = existing.jobs?.configs?.find((c) => c.type === type);
    return userConfig?.enabled ?? true;
  });

  for (let i = 0; i < jobTypes.length; i++) {
    const check = currentJobStates[i] ? c.success("[x]") : c.dim("[ ]");
    console.log(`    ${check} ${c.bold(`${i + 1}.`)} ${JOB_LABELS[jobTypes[i]]}`);
  }
  console.log("");

  const jobInput = await ask(
    `  Enable which jobs? ${c.dim("(1,2,3,4)")} `
  );

  let enabledJobs: Set<JobType>;
  if (jobInput === "") {
    enabledJobs = new Set(jobTypes);
  } else {
    const indices = jobInput
      .split(",")
      .map((s) => parseInt(s.trim(), 10) - 1)
      .filter((i) => i >= 0 && i < jobTypes.length);
    enabledJobs = new Set(indices.map((i) => jobTypes[i]));
  }

  for (const type of jobTypes) {
    const label = JOB_LABELS[type];
    if (enabledJobs.has(type)) {
      console.log(`  ${c.success("✔")} ${label}`);
    } else {
      console.log(`  ${c.dim("✖")} ${c.dim(label)}`);
    }
  }
  console.log("");

  // ── Step 3: Schedule ────────────────────────────────────────────────
  console.log(`  ${c.primary("Step 3/5")} ${c.bold("Schedule")}`);
  console.log(`  ${c.dim("When should scans run?")}\n`);

  for (const [key, opt] of Object.entries(SCHEDULE_OPTIONS)) {
    console.log(`    ${c.bold(`${key}.`)} ${opt.label}`);
  }
  console.log("");

  const currentSchedule = existing.jobs?.schedule ?? "0 2 * * *";
  const scheduleInput = await ask(
    `  Select schedule ${c.dim("(1)")} `
  );

  let schedule: string;
  const scheduleChoice = scheduleInput || "1";
  const selectedSchedule = SCHEDULE_OPTIONS[scheduleChoice];

  if (selectedSchedule && selectedSchedule.cron) {
    schedule = selectedSchedule.cron;
    console.log(`  ${c.success("✔")} ${selectedSchedule.label}\n`);
  } else if (scheduleChoice === "4") {
    const cronInput = await ask(
      `  Enter cron expression ${c.dim(`(${currentSchedule})`)} `
    );
    schedule = cronInput || currentSchedule;
    console.log(`  ${c.success("✔")} Custom: ${schedule}\n`);
  } else {
    schedule = "0 2 * * *";
    console.log(`  ${c.success("✔")} Nightly (2:00 AM)\n`);
  }

  // ── Step 4: Autonomy level ──────────────────────────────────────────
  console.log(`  ${c.primary("Step 4/5")} ${c.bold("Autonomy Level")}`);
  console.log(`  ${c.dim("How much autonomy should the agent have?")}\n`);

  for (const [key, opt] of Object.entries(AUTONOMY_OPTIONS)) {
    console.log(`    ${c.bold(`${key}.`)} ${opt.label}`);
    console.log(`       ${c.dim(opt.description)}`);
  }
  console.log("");

  const autonomyInput = await ask(
    `  Select autonomy level ${c.dim("(2)")} `
  );
  const autonomyChoice = autonomyInput || "2";
  const selectedAutonomy =
    AUTONOMY_OPTIONS[autonomyChoice] ?? AUTONOMY_OPTIONS["2"];
  console.log(`  ${c.success("✔")} ${selectedAutonomy.label}\n`);

  // ── Step 5: Telegram check ──────────────────────────────────────────
  console.log(`  ${c.primary("Step 5/5")} ${c.bold("Telegram Integration")}`);

  const hasTelegram = !!(existing.telegram?.botToken && existing.telegram?.chatId);
  if (hasTelegram) {
    console.log(
      `  ${c.success("✔")} Telegram is configured. Notifications will be sent to your chat.\n`
    );
  } else {
    console.log(
      `  ${c.dim("⚠")} ${c.dim("Telegram is not configured. Job notifications will only appear in logs.")}`
    );
    console.log(
      `  ${c.dim("  Run")} ${c.primary("locus telegram setup")} ${c.dim("to enable Telegram notifications.")}\n`
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────
  const enabledJobNames = jobTypes
    .filter((t) => enabledJobs.has(t))
    .map((t) => JOB_LABELS[t]);
  const scheduleLabel =
    Object.values(SCHEDULE_OPTIONS).find((o) => o.cron === schedule)?.label ??
    `Custom (${schedule})`;

  console.log(`  ${c.header(" SUMMARY ")}\n`);
  console.log(`    ${c.primary("Status:")}    ${c.success("Enabled")}`);
  console.log(
    `    ${c.primary("Jobs:")}      ${enabledJobNames.join(", ") || c.dim("None")}`
  );
  console.log(`    ${c.primary("Schedule:")}  ${scheduleLabel}`);
  console.log(
    `    ${c.primary("Autonomy:")}  ${selectedAutonomy.label}`
  );
  console.log(
    `    ${c.primary("Telegram:")}  ${hasTelegram ? "Connected" : "Not configured"}`
  );
  console.log("");

  const confirmInput = await ask(
    `  Save this configuration? ${c.dim("(Y/n)")} `
  );
  if (confirmInput && !confirmInput.toLowerCase().startsWith("y")) {
    console.log(`\n  ${c.dim("Configuration not saved.")}\n`);
    return;
  }

  // ── Save ────────────────────────────────────────────────────────────
  const jobConfigs = jobTypes.map((type) => ({
    type,
    enabled: enabledJobs.has(type),
    schedule: { cronExpression: schedule, enabled: enabledJobs.has(type) },
    severity:
      type === JobType.FLAKY_TEST_DETECTION
        ? JobSeverity.REQUIRE_APPROVAL
        : JobSeverity.AUTO_EXECUTE,
    options: {},
  }));

  const autonomyRules = buildAutonomyRules(selectedAutonomy.level);

  const settings = {
    ...existing,
    jobs: {
      enabled: true,
      schedule,
      configs: jobConfigs,
    },
    autonomy: {
      ...existing.autonomy,
      rules: autonomyRules,
    },
  };

  manager.save(settings);

  console.log(`
  ${c.success("✔")} ${c.bold("Configuration saved to .locus/settings.json")}

  ${c.bold("Next steps:")}
    Start the daemon:  ${c.primary("locus daemon start")}
    View job status:   ${c.primary("locus jobs list")}
    Run jobs manually: ${c.primary("locus jobs run")}
`);
}
