import type { ToolCall } from "@langchain/core/messages/tool";
import { type $FixMe, type AIArtifact } from "@locusai/shared";
import { ToolExecutionResult } from "../interfaces";
import { ToolRegistry } from "../tools/index";
import { ILocusProvider, ToolResponse } from "../tools/interfaces";
import { DocumentCompiler } from "./compiler"; // Add if missing, or maybe pass via DI

export class ToolHandler {
  private registry: ToolRegistry;

  constructor(
    private provider: ILocusProvider,
    private workspaceId: string,
    private compiler?: DocumentCompiler // Optional dependency
  ) {
    this.registry = new ToolRegistry(
      this.provider,
      this.workspaceId,
      this.compiler
    );
  }

  async executeCalls(toolCalls: ToolCall[]): Promise<ToolExecutionResult> {
    // For execution, we check ALL tools.
    // Optimization: We could filter by the tool names in toolCalls if registry supported lookup by name.
    const tools = this.registry.getAllTools();
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

    return {
      observations,
      artifacts: uniqueArtifacts,
      suggestedActions: [],
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
        const startDate = args.startDate
          ? new Date(args.startDate).toLocaleDateString()
          : "TBD";
        const endDate = args.endDate
          ? new Date(args.endDate).toLocaleDateString()
          : "TBD";
        artifacts.push({
          id: res.sprintId,
          type: "sprint",
          title: args.name || "New Sprint",
          content: `### Sprint: ${args.name || "New Sprint"}\n\n**Duration:** ${startDate} - ${endDate}\n\n**Goal:** ${args.goal || "Not specified"}`,
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
          const startDate = s.startDate
            ? new Date(s.startDate).toLocaleDateString()
            : "TBD";
          const endDate = s.endDate
            ? new Date(s.endDate).toLocaleDateString()
            : "TBD";
          artifacts.push({
            id: s.id,
            type: "sprint",
            title: s.name,
            content: `### Sprint: ${s.name}\n\n**Duration:** ${startDate} - ${endDate}\n\n**Status:** ${s.status}`,
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
}
