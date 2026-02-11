import { parseArgs } from "node:util";
import { AgentOrchestrator, c, DEFAULT_MODEL } from "@locusai/sdk/node";
import { ConfigManager } from "../config-manager";
import { SettingsManager } from "../settings-manager";
import { requireInitialization, resolveProvider, VERSION } from "../utils";
import { WorkspaceResolver } from "../workspace-resolver";

export async function runCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      "api-key": { type: "string" },
      workspace: { type: "string" },
      sprint: { type: "string" },
      model: { type: "string" },
      provider: { type: "string" },
      agents: { type: "string" },
      worktree: { type: "boolean" },
      "auto-push": { type: "boolean" },
      "skip-planning": { type: "boolean" },
      "api-url": { type: "string" },
      dir: { type: "string" },
    },
    strict: false,
  });

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "run");
  const configManager = new ConfigManager(projectPath);
  configManager.updateVersion(VERSION);

  const settingsManager = new SettingsManager(projectPath);
  const settings = settingsManager.load();

  const apiKey = (values["api-key"] as string) || settings.apiKey;

  if (!apiKey) {
    console.error(c.error("Error: API key is required"));
    console.error(
      c.dim(
        "Configure with: locus config setup --api-key <key>\n  Or pass --api-key flag"
      )
    );
    process.exit(1);
  }

  let workspaceId = values.workspace as string | undefined;

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

  // Parse agent count: CLI flag > settings > default (1)
  const parsedAgents = Number.parseInt(values.agents as string, 10);
  const agentCount = Math.min(
    Math.max(parsedAgents || settings.agentCount || 1, 1),
    5
  );
  // Worktrees are always enabled by default for per-task isolation
  const useWorktrees = (values.worktree as boolean | undefined) ?? true;
  const autoPush = (values["auto-push"] as boolean | undefined) ?? true;

  // Resolve workspace ID
  try {
    const resolver = new WorkspaceResolver(configManager, {
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

  const orchestrator = new AgentOrchestrator({
    workspaceId: workspaceId as string,
    sprintId: (values.sprint as string) || "",
    model,
    provider,
    apiBase,
    maxIterations: 100,
    projectPath,
    apiKey: apiKey as string,
    agentCount,
    useWorktrees,
    autoPush,
  });

  orchestrator.on("agent:spawned", (data) =>
    console.log(`  ${c.info("●")} ${c.bold("Agent spawned:")} ${data.agentId}`)
  );
  orchestrator.on("task:assigned", (data) =>
    console.log(`  ${c.info("●")} ${c.bold("Claimed:")} ${data.title}`)
  );
  orchestrator.on("task:completed", (data) =>
    console.log(
      `  ${c.success("✔")} ${c.success("Completed:")} ${c.dim(data.taskId)}`
    )
  );
  orchestrator.on("task:failed", (data) =>
    console.log(
      `  ${c.error("✖")} ${c.error("Failed:")} ${c.bold(data.taskId)}: ${data.error}`
    )
  );
  orchestrator.on("agent:stale", (data) =>
    console.log(
      `  ${c.error("⚠")} ${c.error("Stale agent killed:")} ${data.agentId}`
    )
  );

  // Handle graceful shutdown - prevent double execution
  let isShuttingDown = false;
  const handleSignal = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(
      `\n${c.info(`Received ${signal}. Stopping agents and cleaning up worktrees...`)}`
    );
    await orchestrator.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));

  const agentLabel = agentCount > 1 ? `${agentCount} agents` : "1 agent";
  console.log(
    `\n  ${c.primary("🚀")} ${c.bold(`Starting ${agentLabel} in`)} ${c.primary(projectPath)}...`
  );
  if (useWorktrees) {
    console.log(`  ${c.dim("Each task will run in an isolated worktree")}`);
    if (autoPush) {
      console.log(
        `  ${c.dim("Branches will be committed and pushed to remote")}`
      );
    } else {
      console.log(
        `  ${c.dim("Changes will be committed locally before cleanup")}`
      );
    }
  }
  await orchestrator.start();
}
