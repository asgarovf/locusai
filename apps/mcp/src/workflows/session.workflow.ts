import { logger } from "../lib/logger.js";
import { ClientConfig, SessionContext } from "../lib/types.js";
import { LocusService } from "../services/locus.service.js";

export class SessionWorkflow {
  private locusService: LocusService;

  constructor(config: ClientConfig) {
    this.locusService = new LocusService(config);
  }

  async start(): Promise<SessionContext> {
    logger.info("SessionWorkflow", "Starting session sequence...");
    const sprint = await this.locusService.getActiveSprint();

    if (sprint) {
      logger.info("SessionWorkflow", `Found active sprint: ${sprint.name}`);

      try {
        logger.info("SessionWorkflow", "Planning sprint...");

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
