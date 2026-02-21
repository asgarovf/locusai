import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  c,
  createAiRunner,
  DEFAULT_MODEL,
  LOCUS_CONFIG,
  PrService,
  ReviewerWorker,
  ReviewService,
} from "@locusai/sdk/node";
import { SettingsManager } from "../../settings-manager";
import { resolveProvider } from "../../utils";
import { WorkspaceResolver } from "../../workspace-resolver";
import type { REPLSession, SlashCommand } from "../slash-commands";

export const reviewCommand: SlashCommand = {
  name: "review",
  aliases: [],
  description: "Review PRs or local staged changes",
  usage: "/review | /review local",
  category: "ai",
  execute: async (session: REPLSession, args?: string) => {
    const trimmed = (args ?? "").trim();

    if (trimmed === "local") {
      return reviewLocal(session);
    }

    if (!trimmed) {
      return reviewPrs(session);
    }

    showReviewHelp();
  },
};

// ── PR review ─────────────────────────────────────────────────

async function reviewPrs(session: REPLSession): Promise<void> {
  const projectPath = session.getProjectPath();
  const settingsManager = new SettingsManager(projectPath);
  const settings = settingsManager.load();

  const apiKey = settings.apiKey;
  if (!apiKey) {
    console.log(
      `\n  ${c.error("✖")} ${c.red("API key is required for PR review")}\n`
    );
    console.log(
      `  ${c.dim("Configure with:")} ${c.cyan("locus config setup --api-key <key>")}`
    );
    console.log(
      `  ${c.dim("Or switch provider:")} ${c.cyan("/provider")}\n`
    );
    return;
  }

  const provider = resolveProvider(settings.provider);
  const model = settings.model || DEFAULT_MODEL[provider];
  const apiBase = settings.apiUrl || "https://api.locusai.dev/api";

  // Resolve workspace
  let workspaceId: string;
  try {
    const resolver = new WorkspaceResolver({
      apiKey,
      apiBase,
      workspaceId: settings.workspaceId,
    });
    workspaceId = await resolver.resolve();
  } catch (error) {
    console.log(
      `\n  ${c.error("✖")} ${c.red(error instanceof Error ? error.message : String(error))}\n`
    );
    return;
  }

  // Check for unreviewed PRs
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
    `\n  ${c.header(" REVIEW ")} ${c.bold(`Found ${unreviewedPrs.length} unreviewed PR(s). Starting reviewer...`)}\n`
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

  try {
    await reviewer.run();
    console.log(`\n  ${c.success("✔")} ${c.success("Review complete!")}\n`);
  } catch (error) {
    console.log(
      `\n  ${c.error("✖")} ${c.red("Review failed:")} ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }
}

// ── Local staged-changes review ───────────────────────────────

async function reviewLocal(session: REPLSession): Promise<void> {
  const projectPath = session.getProjectPath();
  const provider = session.getProvider();
  const model = session.getModel();

  const aiRunner = createAiRunner(provider, { projectPath, model });

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
    `\n  ${c.header(" REVIEW ")} ${c.bold("Reviewing staged changes...")}\n`
  );
  console.log(`  ${c.dim("Model:")} ${c.dim(`${model} (${provider})`)}\n`);

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

// ── Help ──────────────────────────────────────────────────────

function showReviewHelp(): void {
  console.log(`
  ${c.header(" REVIEW ")} ${c.dim("— AI Code Review")}

    ${c.cyan("/review")}         Review unreviewed Locus PRs on GitHub
    ${c.cyan("/review local")}   Review staged changes locally

  ${c.dim("PR review requires an API key.")}
  ${c.dim("Configure with: locus config setup --api-key <key>")}
`);
}
