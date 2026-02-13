import type { AiProvider } from "../ai/runner.js";
import { PROVIDER } from "../core/config.js";
import { AgentWorker } from "./worker.js";
import type { WorkerConfig } from "./worker-types.js";

function resolveProvider(value: string | undefined): AiProvider {
  if (!value || value.startsWith("--")) {
    console.warn(
      "Warning: --provider requires a value. Falling back to 'claude'."
    );
    return PROVIDER.CLAUDE;
  }
  if (value === PROVIDER.CLAUDE || value === PROVIDER.CODEX) return value;
  console.warn(
    `Warning: invalid --provider value '${value}'. Falling back to 'claude'.`
  );
  return PROVIDER.CLAUDE;
}

/**
 * Parse CLI arguments into a WorkerConfig.
 */
export function parseWorkerArgs(argv: string[]): WorkerConfig {
  const args = argv.slice(2);
  const config: Partial<WorkerConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--agent-id") config.agentId = args[++i];
    else if (arg === "--workspace-id") config.workspaceId = args[++i];
    else if (arg === "--sprint-id") config.sprintId = args[++i];
    else if (arg === "--api-url") config.apiBase = args[++i];
    else if (arg === "--api-key") config.apiKey = args[++i];
    else if (arg === "--project-path") config.projectPath = args[++i];
    else if (arg === "--model") config.model = args[++i];
    else if (arg === "--provider") {
      const value = args[i + 1];
      if (value && !value.startsWith("--")) i++;
      config.provider = resolveProvider(value);
    }
  }

  if (
    !config.agentId ||
    !config.workspaceId ||
    !config.apiBase ||
    !config.apiKey ||
    !config.projectPath
  ) {
    console.error("Missing required arguments");
    process.exit(1);
  }

  return config as WorkerConfig;
}

// CLI entry point — only runs when this file is the entry script
const entrypoint = process.argv[1]?.split(/[\\/]/).pop();
if (entrypoint === "worker-cli.js" || entrypoint === "worker-cli.ts") {
  process.title = "locus-worker";

  const config = parseWorkerArgs(process.argv);
  const worker = new AgentWorker(config);
  worker.run().catch((err) => {
    console.error("Fatal worker error:", err);
    process.exit(1);
  });
}
