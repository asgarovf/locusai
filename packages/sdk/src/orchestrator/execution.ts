import type { Task } from "@locusai/shared";
import { TaskStatus as TS } from "@locusai/shared";
import { getDefaultBranch } from "../git/git-utils.js";
import { c } from "../utils/colors.js";
import type { AgentPool } from "./agent-pool.js";
import type { TierMergeService } from "./tier-merge.js";
import type { OrchestratorConfig } from "./types.js";

/** Delay between spawning consecutive agents to avoid worktree race conditions */
const SPAWN_DELAY_MS = 5_000;

/**
 * Orchestrates how tasks are dispatched to agents.
 *
 * Two execution strategies:
 * - **Tier-based**: Tasks grouped by tier; each tier runs in parallel,
 *   tiers execute sequentially with stacked branching.
 * - **Legacy**: All tasks dispatched to agents in parallel on separate
 *   branches from the default branch.
 */
export class ExecutionStrategy {
  constructor(
    private config: OrchestratorConfig,
    private pool: AgentPool,
    private tierMerge: TierMergeService,
    private resolvedSprintId: string | null,
    private isRunning: () => boolean
  ) {}

  /**
   * Determine the execution strategy and run tasks.
   */
  async execute(tasks: Task[]): Promise<void> {
    const hasTiers = tasks.some((t) => t.tier !== null && t.tier !== undefined);
    const useWorktrees = this.config.useWorktrees ?? true;

    if (hasTiers && useWorktrees) {
      await this.tierBasedExecution(tasks);
    } else {
      await this.legacyExecution(tasks);
    }
  }

  /**
   * Tier-based execution: run tasks tier-by-tier with stacked branching.
   *
   * Tier 0 branches from main. After tier 0 completes, a merge branch
   * is created. Tier 1 branches from that merge branch, and so on.
   *
   * ```
   * main
   * ├── agent/task-A (tier 0)
   * ├── agent/task-B (tier 0)
   * ├── locus/tier-0 (merge of A + B)
   * │   ├── agent/task-C (tier 1)
   * │   ├── agent/task-D (tier 1)
   * │   ├── locus/tier-1 (merge of C + D)
   * │   │   └── agent/task-E (tier 2)
   * ```
   */
  private async tierBasedExecution(allTasks: Task[]): Promise<void> {
    const tierMap = groupByTier(allTasks);
    const tiers = Array.from(tierMap.keys()).sort((a, b) => a - b);
    const defaultBranch = getDefaultBranch(this.config.projectPath);

    console.log(
      c.primary(
        `📊 Tier-based execution: ${tiers.length} tier(s) detected [${tiers.join(", ")}]`
      )
    );

    let currentBaseBranch = defaultBranch;

    for (const tier of tiers) {
      if (!this.isRunning()) break;

      const tierTasks = tierMap.get(tier) ?? [];
      const dispatchable = tierTasks.filter(isDispatchable);

      if (dispatchable.length === 0) {
        console.log(
          c.dim(
            `ℹ  Tier ${tier}: all ${tierTasks.length} task(s) already completed, skipping`
          )
        );
        // Check if a merge branch exists from a previous run
        const tierBranch = this.tierMerge.tierBranchName(tier);
        if (this.tierMerge.remoteBranchExists(tierBranch)) {
          currentBaseBranch = tierBranch;
        }
        continue;
      }

      console.log(
        `\n${c.primary(`🏗️  Tier ${tier}:`)} ${dispatchable.length} task(s) | base: ${c.bold(currentBaseBranch)}`
      );

      // Spawn agents for this tier with the correct base branch
      await this.spawnAgentsForTasks(dispatchable.length, currentBaseBranch);

      // Wait for ALL agents in this tier to complete
      await this.pool.waitForAll(this.isRunning);

      console.log(c.success(`✓ Tier ${tier} complete`));

      // Create merge branch for next tier (skip for the last tier)
      if (this.config.autoPush && tiers.indexOf(tier) < tiers.length - 1) {
        const mergeBranch = this.tierMerge.createMergeBranch(
          tier,
          currentBaseBranch
        );
        if (mergeBranch) {
          currentBaseBranch = mergeBranch;
          console.log(
            c.success(
              `📌 Created merge branch: ${mergeBranch} (base for tier ${tier + 1})`
            )
          );
        }
      }
    }
  }

  /**
   * Legacy execution: all tasks dispatched in parallel on separate branches.
   *
   * Each agent creates a worktree branching from the default branch.
   * All task PRs target the default branch directly.
   */
  private async legacyExecution(tasks: Task[]): Promise<void> {
    const defaultBranch = getDefaultBranch(this.config.projectPath);
    await this.spawnAgentsForTasks(tasks.length, defaultBranch);
    await this.pool.waitForAll(this.isRunning);
  }

  /**
   * Spawn a batch of agents with staggered delays.
   */
  private async spawnAgentsForTasks(
    taskCount: number,
    baseBranch: string
  ): Promise<void> {
    const agentsToSpawn = Math.min(this.pool.effectiveAgentCount, taskCount);
    const spawnPromises: Promise<void>[] = [];

    for (let i = 0; i < agentsToSpawn; i++) {
      if (i > 0) {
        await sleep(SPAWN_DELAY_MS);
      }
      spawnPromises.push(this.pool.spawn(i, this.resolvedSprintId, baseBranch));
    }

    await Promise.all(spawnPromises);
  }
}

/**
 * Group tasks by their tier assignment.
 */
function groupByTier(tasks: Task[]): Map<number, Task[]> {
  const tierMap = new Map<number, Task[]>();
  for (const task of tasks) {
    const tier = task.tier ?? 0;
    const existing = tierMap.get(tier);
    if (existing) {
      existing.push(task);
    } else {
      tierMap.set(tier, [task]);
    }
  }
  return tierMap;
}

/**
 * Check if a task is eligible for dispatch.
 */
function isDispatchable(task: Task): boolean {
  return (
    task.status === TS.BACKLOG ||
    (task.status === TS.IN_PROGRESS && !task.assignedTo)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
