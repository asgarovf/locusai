import { parseArgs } from "node:util";
import { c, WorktreeManager } from "@locusai/sdk/node";
import { requireInitialization } from "../utils";

export async function agentsCommand(args: string[]): Promise<void> {
  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "list":
      await agentsList(subArgs);
      break;
    case "clean":
      await agentsClean(subArgs);
      break;
    default:
      showAgentsHelp();
      break;
  }
}

async function agentsList(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: "string" },
    },
    strict: false,
  });

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "agents list");

  const manager = new WorktreeManager(projectPath);
  const worktrees = manager.listAgentWorktrees();

  if (worktrees.length === 0) {
    console.log(`\n  ${c.dim("No active agent worktrees found.")}\n`);
    console.log(
      `  ${c.dim("Start agents with:")} ${c.primary("locus run --agents 3 --api-key YOUR_KEY")}\n`
    );
    return;
  }

  console.log(`\n  ${c.primary("Active Agent Worktrees:")}\n`);

  for (const wt of worktrees) {
    const branchDisplay = wt.branch || "(detached)";
    const statusIcon = wt.isPrunable ? c.yellow("⚠") : c.green("●");
    const statusLabel = wt.isPrunable ? c.yellow("stale") : c.green("active");

    console.log(
      `  ${statusIcon} ${c.bold(branchDisplay)} ${c.dim(`[${statusLabel}]`)}`
    );
    console.log(`    ${c.dim("Path:")} ${wt.path}`);
    console.log(`    ${c.dim("HEAD:")} ${wt.head.slice(0, 8)}`);
    console.log();
  }

  console.log(`  ${c.dim(`Total: ${worktrees.length} worktree(s)`)}\n`);
}

async function agentsClean(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: "string" },
      all: { type: "boolean" },
    },
    strict: false,
  });

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "agents clean");

  const manager = new WorktreeManager(projectPath);

  if (values.all) {
    const removed = manager.removeAll();
    if (removed > 0) {
      console.log(
        `\n  ${c.success("✔")} Removed ${removed} agent worktree(s)\n`
      );
    } else {
      console.log(`\n  ${c.dim("No agent worktrees to remove.")}\n`);
    }
  } else {
    const pruned = manager.prune();
    if (pruned > 0) {
      console.log(`\n  ${c.success("✔")} Pruned ${pruned} stale worktree(s)\n`);
    } else {
      console.log(
        `\n  ${c.dim("No stale worktrees to prune.")} ${c.dim("Use --all to remove all agent worktrees.")}\n`
      );
    }
  }
}

function showAgentsHelp(): void {
  console.log(`
  ${c.header(" AGENT MANAGEMENT ")}
    ${c.primary("locus agents")} ${c.dim("<command> [options]")}

  ${c.header(" COMMANDS ")}
    ${c.success("list")}      List active agent worktrees
    ${c.success("clean")}     Prune stale worktrees (or --all to remove all)

  ${c.header(" OPTIONS ")}
    ${c.secondary("--dir")} <path>     Project directory (default: current)
    ${c.secondary("--all")}            Remove all agent worktrees (with clean)

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus agents list")}
    ${c.dim("$")} ${c.primary("locus agents clean")}
    ${c.dim("$")} ${c.primary("locus agents clean --all")}
`);
}
