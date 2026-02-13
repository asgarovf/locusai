import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  c,
  createAiRunner,
  DEFAULT_MODEL,
  LOCUS_CONFIG,
  PrService,
  ReviewerWorker,
  ReviewService,
} from "@locusai/sdk/node";
import { ConfigManager } from "../config-manager";
import { SettingsManager } from "../settings-manager";
import { requireInitialization, resolveProvider, VERSION } from "../utils";
import { WorkspaceResolver } from "../workspace-resolver";

/**
 * `locus review` — review open Locus PRs on GitHub using AI.
 * `locus review local` — review staged changes locally (legacy behavior).
 */
export async function reviewCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (subcommand === "local") {
    return reviewLocalCommand(args.slice(1));
  }

  // Default: PR review via GitHub
  return reviewPrsCommand(args);
}

/**
 * Review open Locus PRs on GitHub.
 */
async function reviewPrsCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      "api-key": { type: "string" },
      workspace: { type: "string" },
      model: { type: "string" },
      provider: { type: "string" },
      "api-url": { type: "string" },
      dir: { type: "string" },
    },
    strict: false,
  });

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "review");
  const configManager = new ConfigManager(projectPath);
  configManager.updateVersion(VERSION);

  const settingsManager = new SettingsManager(projectPath);
  const settings = settingsManager.load();

  const apiKey = (values["api-key"] as string) || settings.apiKey;

  if (!apiKey) {
    console.error(c.error("Error: API key is required for PR review"));
    console.error(
      c.dim(
        "Configure with: locus config setup --api-key <key>\n  Or pass --api-key flag"
      )
    );
    console.error(
      c.dim("For local staged-changes review, use: locus review local")
    );
    process.exit(1);
  }

  const provider = resolveProvider(
    (values.provider as string) || settings.provider
  );
  const model =
    (values.model as string | undefined) ||
    settings.model ||
    DEFAULT_MODEL[provider];
  const apiBase =
    (values["api-url"] as string) ||
    settings.apiUrl ||
    "https://api.locusai.dev/api";

  // Resolve workspace ID
  let workspaceId: string;
  try {
    const resolver = new WorkspaceResolver({
      apiKey,
      apiBase,
      workspaceId: values.workspace as string | undefined,
    });
    workspaceId = await resolver.resolve();
  } catch (error) {
    console.error(
      c.error(error instanceof Error ? error.message : String(error))
    );
    process.exit(1);
  }

  // Check for unreviewed PRs first
  const log = (
    msg: string,
    level: "info" | "success" | "warn" | "error" = "info"
  ) => {
    const colorFn = {
      info: c.cyan,
      success: c.green,
      warn: c.yellow,
      error: c.red,
    }[level];
    const prefix = { info: "ℹ", success: "✓", warn: "⚠", error: "✗" }[level];
    console.log(`  ${colorFn(`${prefix} ${msg}`)}`);
  };

  const prService = new PrService(projectPath, log);
  const unreviewedPrs = prService.listUnreviewedLocusPrs();

  if (unreviewedPrs.length === 0) {
    console.log(`\n  ${c.dim("No unreviewed Locus PRs found.")}\n`);
    return;
  }

  console.log(
    `\n  ${c.primary("🔍")} ${c.bold(`Found ${unreviewedPrs.length} unreviewed PR(s). Starting reviewer...`)}\n`
  );

  const agentId = `reviewer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const reviewer = new ReviewerWorker({
    agentId,
    workspaceId,
    apiBase,
    projectPath,
    apiKey,
    model,
    provider,
  });

  // Handle graceful shutdown
  let isShuttingDown = false;
  const handleSignal = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(
      `\n${c.info("Received shutdown signal. Stopping reviewer...")}`
    );
    process.exit(0);
  };

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  await reviewer.run();
}

/**
 * Review staged changes locally with AI (legacy `locus review` behavior).
 */
async function reviewLocalCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      model: { type: "string" },
      provider: { type: "string" },
      dir: { type: "string" },
    },
    strict: false,
  });

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "review local");

  const localSettings = new SettingsManager(projectPath).load();

  const provider = resolveProvider(
    (values.provider as string) || localSettings.provider
  );
  const model =
    (values.model as string | undefined) ||
    localSettings.model ||
    DEFAULT_MODEL[provider];

  const aiRunner = createAiRunner(provider, {
    projectPath,
    model,
  });

  const reviewService = new ReviewService({
    aiRunner,
    projectPath,
    log: (msg, level) => {
      switch (level) {
        case "error":
          console.log(`  ${c.error("✖")} ${msg}`);
          break;
        case "success":
          console.log(`  ${c.success("✔")} ${msg}`);
          break;
        default:
          console.log(`  ${c.dim(msg)}`);
      }
    },
  });

  console.log(
    `\n  ${c.primary("🔍")} ${c.bold("Reviewing staged changes...")}\n`
  );

  const report = await reviewService.reviewStagedChanges(null);

  if (!report) {
    console.log(`  ${c.dim("No changes to review.")}\n`);
    return;
  }

  // Save the report
  const reviewsDir = join(
    projectPath,
    LOCUS_CONFIG.dir,
    LOCUS_CONFIG.reviewsDir
  );
  if (!existsSync(reviewsDir)) {
    mkdirSync(reviewsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(reviewsDir, `review-${timestamp}.md`);
  writeFileSync(reportPath, report, "utf-8");

  console.log(`\n  ${c.success("✔")} ${c.success("Review complete!")}`);
  console.log(`  ${c.dim("Report saved to:")} ${c.primary(reportPath)}\n`);
}
