import { parseArgs } from "node:util";
import {
  CodebaseIndexer,
  c,
  createAiRunner,
  DEFAULT_MODEL,
} from "@locusai/sdk/node";
import { ConfigManager } from "../config-manager";
import { TreeSummarizer } from "../tree-summarizer";
import { requireInitialization, resolveProvider, VERSION } from "../utils";

export async function indexCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: "string" },
      model: { type: "string" },
      provider: { type: "string" },
    },
    strict: false,
  });
  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "index");
  new ConfigManager(projectPath).updateVersion(VERSION);

  const provider = resolveProvider(values.provider as string);
  const model = (values.model as string | undefined) || DEFAULT_MODEL[provider];

  const aiRunner = createAiRunner(provider, {
    projectPath,
    model,
  });
  const summarizer = new TreeSummarizer(aiRunner);
  const indexer = new CodebaseIndexer(projectPath);

  console.log(
    `\n  ${c.step(" INDEX ")} ${c.primary("Analyzing codebase in")} ${c.bold(projectPath)}...`
  );
  try {
    const index = await indexer.index(
      (msg) => console.log(`  ${c.dim(msg)}`),
      (tree) => summarizer.summarize(tree)
    );

    if (index) {
      indexer.saveIndex(index);
    }
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.error("Indexing failed:")} ${c.red(error instanceof Error ? error.message : String(error))}`
    );
    console.error(
      c.dim("  The agent might have limited context until indexing succeeds.\n")
    );
  }

  console.log(`\n  ${c.success("✔")} ${c.success("Indexing complete!")}\n`);
}
