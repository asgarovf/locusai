import type { ToolCall } from "@langchain/core/messages/tool";
import { type $FixMe, type AIArtifact, SuggestedAction } from "@locusai/shared";
import { ToolExecutionResult } from "src/interfaces";
import { getAgentTools } from "../tools/index";
import { ILocusProvider, ToolResponse } from "../tools/interfaces";

export class ToolHandler {
  constructor(
    private provider: ILocusProvider,
    private workspaceId: string
  ) {}

  async executeCalls(toolCalls: ToolCall[]): Promise<ToolExecutionResult> {
    const tools = getAgentTools(this.provider, this.workspaceId);
    console.log("[LocusAgent] LLM requested tool calls");

    const observations: string[] = [];
    const artifacts: AIArtifact[] = [];

    for (const call of toolCalls) {
      const tool = tools.find((t) => t.name === call.name);
      if (tool) {
        console.log(`[LocusAgent] Executing tool: ${tool.name}`);
        try {
          const resultString = await (tool as $FixMe).invoke(call.args);
          observations.push(`Tool ${tool.name} executed successfully.`);

          this.parseArtifacts(resultString, call.args, artifacts);
        } catch (error) {
          console.error(`[LocusAgent] Tool execution failed:`, error);
          observations.push(
            `Tool ${tool.name} failed: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    }

    // Deduplicate artifacts by ID
    const uniqueArtifacts = Array.from(
      new Map(artifacts.map((a) => [a.id, a])).values()
    );

    const suggestedActions = this.generateSuggestedActions(uniqueArtifacts);

    return {
      observations,
      artifacts: uniqueArtifacts,
      suggestedActions,
    };
  }

  private parseArtifacts(
    resultString: string,
    args: $FixMe,
    artifacts: AIArtifact[]
  ) {
    try {
      const res = JSON.parse(resultString) as ToolResponse;
      if (!res.success) return;

      // Single Task
      if (res.taskId) {
        artifacts.push({
          id: res.taskId,
          type: "task",
          title: args.title || "New Task",
          content: args.description || "",
          metadata: { status: args.status || "BACKLOG" },
        });
      }
      // Single Document
      else if (res.docId) {
        artifacts.push({
          id: res.docId,
          type: "document",
          title: args.title || "New Document",
          content: args.content || "",
        });
      }
      // Single Sprint
      else if (res.sprintId) {
        artifacts.push({
          id: res.sprintId,
          type: "sprint",
          title: args.name || "New Sprint",
          content: "", // Sprints don't have content per se
          metadata: { status: "PLANNED" },
        });
      }

      // List of Tasks
      if (res.tasks && Array.isArray(res.tasks)) {
        res.tasks.forEach((t) => {
          artifacts.push({
            id: t.id,
            type: "task",
            title: t.title,
            content: t.description || "",
            metadata: { status: t.status },
          });
        });
      }
      // List of Documents
      else if (res.documents && Array.isArray(res.documents)) {
        res.documents.forEach((d) => {
          artifacts.push({
            id: d.id,
            type: "document",
            title: d.title,
            content: d.content,
          });
        });
      }
      // List of Sprints
      else if (res.sprints && Array.isArray(res.sprints)) {
        res.sprints.forEach((s) => {
          artifacts.push({
            id: s.id,
            type: "sprint",
            title: s.name,
            content: "",
            metadata: {
              status: s.status,
              startDate: s.startDate,
              endDate: s.endDate,
            },
          });
        });
      }
    } catch (_e) {
      // Ignore non-JSON results
    }
  }

  private generateSuggestedActions(artifacts: AIArtifact[]): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    // Heuristic: If we just created tasks, maybe start a sprint?
    const tasks = artifacts.filter((a) => a.type === "task");
    if (tasks.length > 0) {
      actions.push({
        label: "Create Sprint with Tasks",
        type: "start_sprint", // This type should match SuggestedAction['type']
        payload: { taskIds: tasks.map((a) => a.id) },
      });
    }

    return actions;
  }
}
