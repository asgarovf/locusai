import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  c,
  createAiRunner,
  DEFAULT_MODEL,
  LOCUS_CONFIG,
  ReviewService,
} from "@locusai/sdk/node";
import { requireInitialization, resolveProvider } from "../utils";

export async function reviewCommand(args: string[]): Promise<void> {
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
  requireInitialization(projectPath, "review");

  const provider = resolveProvider(values.provider as string);
  const model = (values.model as string | undefined) || DEFAULT_MODEL[provider];

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
