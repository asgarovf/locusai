import type { Sprint, Task } from "@locusai/shared";
import type { LogFn } from "../ai/factory.js";
import type { AiRunner } from "../ai/runner.js";

export interface SprintPlannerDeps {
  aiRunner: AiRunner;
  log: LogFn;
}

/**
 * Handles sprint planning and mindmap generation
 */
export class SprintPlanner {
  constructor(private deps: SprintPlannerDeps) {}

  async planSprint(sprint: Sprint, tasks: Task[]): Promise<string> {
    this.deps.log(`Planning sprint: ${sprint.name}`, "info");

    try {
      const taskList = tasks
        .map(
          (t) => `- [${t.id}] ${t.title}: ${t.description || "No description"}`
        )
        .join("\n");

      const planningPrompt = `# Sprint Planning: ${sprint.name}

You are an expert project manager and lead engineer. You need to create a mindmap and execution plan for the following tasks in this sprint.

## Tasks
${taskList}

## Instructions
1. Analyze dependencies between these tasks.
2. Prioritize them for the most efficient execution.
3. Create a mindmap (in Markdown or Mermaid format) that visualizes the sprint structure.
4. Output your final plan. The plan should clearly state the order of execution.

**IMPORTANT**: 
- Do NOT create any files on the filesystem during this planning phase. 
- Avoid using absolute local paths (e.g., /Users/...) in your output. Use relative paths starting from the project root if necessary.
- Your output will be saved as the official sprint mindmap on the server.`;

      const plan = await this.deps.aiRunner.run(planningPrompt, true);

      this.deps.log(
        "Sprint mindmap generated and posted to server.",
        "success"
      );
      return plan;
    } catch (error) {
      this.deps.log(`Sprint planning failed: ${error}`, "error");
      return sprint.mindmap || "";
    }
  }
}
