#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { CodebaseIndexer } from "@locusai/sdk/src/indexer";
import { AgentOrchestrator } from "@locusai/sdk/src/orchestrator";
import { ConfigManager } from "./config-manager";
import { TreeSummarizer } from "./tree-summarizer";

const VERSION = "0.2.0";

function printBanner() {
  console.log(`
 ██       ██████   ██████  ██    ██  ██████ 
 ██      ██    ██ ██       ██    ██ ██       
 ██      ██    ██ ██       ██    ██ ███████  
 ██      ██    ██ ██       ██    ██      ██ 
 ███████  ██████   ██████   ██████  ███████  v${VERSION}
`);
}

async function runCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      "api-key": { type: "string" },
      workspace: { type: "string" },
      sprint: { type: "string" },
      model: { type: "string", default: "sonnet" },
      "api-url": { type: "string" },
      dir: { type: "string" },
    },
    strict: false,
  });

  const apiKey = values["api-key"] || process.env.LOCUS_API_KEY;
  const workspaceId = values.workspace || process.env.LOCUS_WORKSPACE_ID;
  const projectPath = (values.dir as string) || process.cwd();

  if (!apiKey || !workspaceId) {
    console.error("Error: --api-key and --workspace are required");
    process.exit(1);
  }

  const orchestrator = new AgentOrchestrator({
    workspaceId: workspaceId as string,
    sprintId: (values.sprint as string) || "",
    model: (values.model as string) || "sonnet",
    apiBase: (values["api-url"] as string) || "https://api.locus.dev/api",
    maxIterations: 100,
    projectPath,
    apiKey: apiKey as string,
  });

  orchestrator.on("task:assigned", (data) =>
    console.log(`ℹ [CLAIMED] ${data.title}`)
  );
  orchestrator.on("task:completed", (data) =>
    console.log(`✓ [COMPLETED] ${data.taskId}`)
  );
  orchestrator.on("task:failed", (data) =>
    console.log(`✗ [FAILED] ${data.taskId}: ${data.error}`)
  );

  console.log(`🚀 Starting agent in ${projectPath}...`);
  await orchestrator.start();
}

async function indexCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: { dir: { type: "string" } },
    strict: false,
  });
  const projectPath = (values.dir as string) || process.cwd();

  const summarizer = new TreeSummarizer(projectPath);
  const indexer = new CodebaseIndexer(projectPath);

  console.log(`🔍 Indexing codebase in ${projectPath}...`);
  const index = await indexer.index(
    (msg) => console.log(`  ${msg}`),
    (tree) => summarizer.summarize(tree)
  );
  indexer.saveIndex(index);
  console.log("✅ Indexing complete!");
}

async function main() {
  printBanner();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case "run":
      await runCommand(args);
      break;
    case "index":
      await indexCommand(args);
      break;
    case "init":
      await new ConfigManager(process.cwd()).init(VERSION);
      console.log("✨ Initialized!");
      break;
    default:
      console.log("Usage: locus [run|index|init]");
  }
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
