import { HumanMessage } from "@langchain/core/messages";
import { $FixMe, AIArtifact, SuggestedAction } from "@locusai/shared";
import { Intent } from "../chains/intent";
import { DocumentCompiler } from "../core/compiler";
import { ContextManager } from "../core/context";
import { ToolHandler } from "../core/tool-handler";
import { BaseWorkflow, WorkflowContext } from "../core/workflow";
import { AgentMode, AgentResponse } from "../interfaces/index";
import { ToolRegistry } from "../tools/index";
import { ILocusProvider } from "../tools/interfaces";

export class TaskCreationWorkflow extends BaseWorkflow {
  readonly name = "Task Creation";
  readonly mode = AgentMode.EXECUTING; // Generic executing mode

  constructor(
    private provider: ILocusProvider,
    private workspaceId: string,
    private toolHandler: ToolHandler,
    private compiler: DocumentCompiler
  ) {
    super();
  }

  canHandle(context: WorkflowContext): boolean {
    return context.intent === Intent.CREATE_TASK;
  }

  async execute(context: WorkflowContext): Promise<AgentResponse> {
    const { llm, state, input } = context;

    const registry = new ToolRegistry(
      this.provider,
      this.workspaceId,
      this.compiler
    );
    // Limit tools to just what is needed for task creation to reduce noise
    const tools = [registry.getCreateTaskTool(), registry.getListTasksTool()];

    const toolLLM = (llm as $FixMe).bindTools
      ? (llm as $FixMe).bindTools(tools)
      : llm;

    const projectContext = ContextManager.getProjectContext(state);
    const messages = ContextManager.buildMessages(
      state.history,
      input,
      `${projectContext}\n\nYou are a Senior Technical Lead responsible for creating high-quality engineering tasks.

YOUR GOAL:
1. Analyze the user's request to create a task or fix a bug.
2. If the request is vague, infer the necessary technical details (Acceptance Criteria, Priority).
3. Use the 'create_task' tool to create the task.
   - Title: Clear and action-oriented.
   - Description: Detailed, including context.
   - Priority: ONE OF: "LOW", "MEDIUM", "HIGH", "CRITICAL".
   - acceptanceChecklist: MUST be an ARRAY of objects.
     Example: [ { "text": "Verify login", "done": false, "id": "1" } ]
     DO NOT wrap it in an "items" object.
   
   Output Format for Tool Call:
   {
     "title": "...",
     "description": "...",
     "priority": "HIGH",
     "acceptanceChecklist": [ ... ]
   }

4. Confirm creation to the user, providing the new Task ID.

Always create a REAL task in the system. Do not just say "I will create it". Call the tool.`
    );

    let steps = 0;
    const maxSteps = 3; // Should be quick
    const allArtifacts: AIArtifact[] = [];
    const allSuggestedActions: SuggestedAction[] = [];

    while (steps < maxSteps) {
      steps++;

      const response = await toolLLM.invoke(messages);
      messages.push(response);

      if (!response.tool_calls || response.tool_calls.length === 0) {
        const rawContent = this.extractContent(response.content);
        const { cleanContent, actions } = this.extractAISuggestions(rawContent);

        return {
          content:
            cleanContent ||
            (allArtifacts.length > 0
              ? "Task created successfully."
              : "No task created."),
          artifacts: Array.from(
            new Map(allArtifacts.map((a) => [a.id, a])).values()
          ),
          suggestedActions: [...allSuggestedActions, ...actions],
        };
      }

      const toolResult = await this.toolHandler.executeCalls(
        response.tool_calls
      );

      if (toolResult.artifacts) {
        allArtifacts.push(...toolResult.artifacts);
        this.updateWorkflowState(state, toolResult.artifacts);
      }

      // Add visual feedback action if a task was created
      if (toolResult.artifacts.some((a) => a.type === "task")) {
        // Maybe suggest viewing the board?
      }

      const observationText = toolResult.observations.join("\n\n");

      messages.push(
        new HumanMessage(
          `Tool Execution Result:\n${observationText}\n\nConclude by confirming the task creation to the user.`
        )
      );
    }

    return {
      content: "Task creation sequence finished.",
      artifacts: Array.from(
        new Map(allArtifacts.map((a) => [a.id, a])).values()
      ),
      suggestedActions: allSuggestedActions,
    };
  }

  private extractContent(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map((c) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object" && "text" in c) return c.text;
          return "";
        })
        .join("");
    }
    return "";
  }

  private extractAISuggestions(textContent: string): {
    cleanContent: string;
    actions: SuggestedAction[];
  } {
    const suggestionsMatch = textContent.match(
      /<suggestions>([\s\S]*?)<\/suggestions>/
    );

    if (!suggestionsMatch) {
      return { cleanContent: textContent, actions: [] };
    }

    try {
      const actionsJson = JSON.parse(suggestionsMatch[1]);
      const actions = actionsJson.map((a: { label: string; text: string }) => ({
        label: a.label,
        type: "chat_suggestion",
        payload: { text: a.text },
      }));

      const cleanContent = textContent
        .replace(/<suggestions>[\s\S]*?<\/suggestions>/, "")
        .trim();

      return { cleanContent, actions };
    } catch (e) {
      console.warn(
        "[TaskCreationWorkflow] Failed to parse suggested actions:",
        e
      );
      return { cleanContent: textContent, actions: [] };
    }
  }
}
