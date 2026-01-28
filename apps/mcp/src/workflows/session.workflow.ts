import { PromptBuilder } from "@locusai/sdk/node";
import { logger } from "../lib/logger.js";
import {
  AGENT_INSTRUCTIONS,
  ClientConfig,
  SessionContext,
} from "../lib/types.js";
import { LocusService } from "../services/locus.service.js";

export class SessionWorkflow {
  private locusService: LocusService;
  private promptBuilder: PromptBuilder;

  constructor(config: ClientConfig, projectPath: string = process.cwd()) {
    this.locusService = new LocusService(config);
    this.promptBuilder = new PromptBuilder(projectPath);
  }

  async start(): Promise<SessionContext> {
    logger.info("SessionWorkflow", "Starting session sequence...");
    const sprint = await this.locusService.getActiveSprint();

    if (sprint) {
      logger.info("SessionWorkflow", `Found active sprint: ${sprint.name}`);

      try {
        logger.info("SessionWorkflow", "Triggering Server-Side Planning...");
        await this.locusService.triggerAIPlanning(sprint.id);
        logger.info("SessionWorkflow", "Planning sync check initiated.");
      } catch (error) {
        logger.error(
          "SessionWorkflow",
          "Failed to trigger planning:",
          String(error)
        );
      }
    } else {
      logger.info("SessionWorkflow", "No active sprint found.");
    }

    logger.info("SessionWorkflow", "Dispatching task...");
    const task = await this.locusService.dispatchTask(sprint?.id);

    let instructions = AGENT_INSTRUCTIONS;
    if (task) {
      logger.info("SessionWorkflow", `Task dispatched: ${task.id}`);
      // Build dynamic instructions/prompt
      const serverContext = await this.locusService.getTaskContext(task.id);
      instructions = await this.promptBuilder.build(task, {
        taskContext: serverContext,
      });
    } else {
      logger.info("SessionWorkflow", "No task dispatched.");
    }

    return { sprint, task, instructions };
  }

  async completeAndNext(
    taskId: string,
    summary: string,
    artifacts: string[]
  ): Promise<{ task: SessionContext["task"]; instructions?: string }> {
    await this.locusService.completeTask(taskId, summary);

    if (artifacts.length > 0) {
      await this.locusService.addArtifactComment(taskId, artifacts);
    }

    // We do NOT sync artifacts locally or reindex because we are remote.
    // The Agent on the client side is responsible for local state.

    // Get next task
    const sprint = await this.locusService.getActiveSprint();
    const task = await this.locusService.dispatchTask(sprint?.id);

    let instructions: string | undefined;
    if (task) {
      const serverContext = await this.locusService.getTaskContext(task.id);
      instructions = await this.promptBuilder.build(task, {
        taskContext: serverContext,
      });
    }

    return { task, instructions };
  }
}
