import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  createCliLogger,
  resolveAiSettings,
  resolveApiContext,
} from "@locusai/commands";
import {
  c,
  createAiRunner,
  LOCUS_CONFIG,
  PrService,
  ReviewerWorker,
  ReviewService,
} from "@locusai/sdk/node";
import { ConfigManager } from "../config-manager";
import { requireInitialization, VERSION } from "../utils";

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

  // Resolve API context using shared helper
  let apiContext: Awaited<ReturnType<typeof resolveApiContext>>;
  try {
    apiContext = await resolveApiContext({
      projectPath,
      apiKey: values["api-key"] as string | undefined,
      apiUrl: values["api-url"] as string | undefined,
      workspaceId: values.workspace as string | undefined,
    });
  } catch (error) {
    console.error(
      c.error(error instanceof Error ? error.message : String(error))
    );
    console.error(
      c.dim("For local staged-changes review, use: locus review local")
    );
    process.exit(1);
  }

  const { provider, model } = resolveAiSettings({
    projectPath,
    provider: values.provider as string | undefined,
    model: values.model as string | undefined,
  });

  // Check for unreviewed PRs first
  const log = createCliLogger();

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
    workspaceId: apiContext.workspaceId,
    apiBase: apiContext.apiBase,
    projectPath,
    apiKey: apiContext.apiKey,
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

  const { provider, model } = resolveAiSettings({
    projectPath,
    provider: values.provider as string | undefined,
    model: values.model as string | undefined,
  });

  const aiRunner = createAiRunner(provider, {
    projectPath,
    model,
  });

  const reviewService = new ReviewService({
    aiRunner,
    projectPath,
    log: createCliLogger(),
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
