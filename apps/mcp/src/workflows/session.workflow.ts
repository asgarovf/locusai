import {
  AnthropicClient,
  ClaudeRunner,
  SprintPlanner,
} from "@locusai/sdk/node";
import { logger } from "../lib/logger.js";
import { ClientConfig, SessionContext } from "../lib/types.js";
import { LocusService } from "../services/locus.service.js";

export class SessionWorkflow {
  private sprintPlanner: SprintPlanner;
  private locusService: LocusService;

  constructor(config: ClientConfig) {
    // Current directory is the server's directory, not the user's project.
    // We cannot run ClaudeRunner on the server to analyze user code.
    // However, SprintPlanner uses LLMs to plan based on Task text, which is fine.

    const anthropicClient = config.anthropicApiKey
      ? new AnthropicClient({ apiKey: config.anthropicApiKey })
      : null;

    // Fallback runner (though likely won't work well without local project context for some ops)
    // But SprintPlanner mostly needs text.
    const claudeRunner = new ClaudeRunner(process.cwd());

    const logFn = (
      msg: string,
      level?: "info" | "success" | "warn" | "error"
    ) => {
      // Map SDK log levels to our logger
      if (level === "error") logger.error("SDK", msg);
      else if (level === "warn") logger.warn("SDK", msg);
      else logger.info("SDK", msg);
    };

    this.locusService = new LocusService(config);

    this.sprintPlanner = new SprintPlanner({
      anthropicClient,
      claudeRunner,
      log: logFn,
    });
  }

  async start(): Promise<SessionContext> {
    logger.info("SessionWorkflow", "Starting session sequence...");
    const sprint = await this.locusService.getActiveSprint();

    if (sprint) {
      logger.info("SessionWorkflow", `Found active sprint: ${sprint.name}`);

      try {
        logger.info("SessionWorkflow", "Planning sprint...");
        const tasks = await this.locusService.getSprintTasks(sprint.id);
        const plan = await this.sprintPlanner.planSprint(sprint, tasks);

        if (plan && plan !== sprint.mindmap) {
          await this.locusService.updateSprintMindmap(sprint.id, plan);
          sprint.mindmap = plan;
        }
        logger.info("SessionWorkflow", "Sprint planning complete.");
      } catch (error) {
        logger.error(
          "SessionWorkflow",
          "Failed to plan sprint:",
          String(error)
        );
      }
    } else {
      logger.info("SessionWorkflow", "No active sprint found.");
    }

    logger.info("SessionWorkflow", "Dispatching task...");
    const task = await this.locusService.dispatchTask(sprint?.id);
    logger.info(
      "SessionWorkflow",
      task ? `Task dispatched: ${task.id}` : "No task dispatched."
    );

    return { sprint, task };
  }

  async completeAndNext(
    taskId: string,
    summary: string,
    artifacts: string[]
  ): Promise<SessionContext["task"]> {
    await this.locusService.completeTask(taskId, summary);

    if (artifacts.length > 0) {
      await this.locusService.addArtifactComment(taskId, artifacts);
    }

    // We do NOT sync artifacts locally or reindex because we are remote.
    // The Agent on the client side is responsible for local state.

    // Get next task
    const sprint = await this.locusService.getActiveSprint();
    return await this.locusService.dispatchTask(sprint?.id);
  }
}
