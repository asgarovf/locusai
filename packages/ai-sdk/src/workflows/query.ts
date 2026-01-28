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

export class QueryWorkflow extends BaseWorkflow {
  readonly name = "Query";
  readonly mode = AgentMode.QUERY;

  constructor(
    private provider: ILocusProvider,
    private workspaceId: string,
    private toolHandler: ToolHandler,
    private compiler: DocumentCompiler
  ) {
    super();
  }

  canHandle(context: WorkflowContext): boolean {
    if (context.intent === Intent.QUERY) return true;
    return (
      context.state.mode === AgentMode.QUERY &&
      context.intent === Intent.UNKNOWN
    );
  }

  async execute(context: WorkflowContext): Promise<AgentResponse> {
    const { llm, state, input } = context;

    // Build tools
    const registry = new ToolRegistry(
      this.provider,
      this.workspaceId,
      this.compiler
    );
    const tools = registry.getAllTools();

    const toolLLM = (llm as $FixMe).bindTools
      ? (llm as $FixMe).bindTools(tools)
      : llm;

    const projectContext = ContextManager.getProjectContext(state);
    const messages = ContextManager.buildMessages(
      state.history,
      input,
      projectContext
    );

    let steps = 0;
    const maxSteps = 5;
    const allArtifacts: AIArtifact[] = [];
    const allSuggestedActions: SuggestedAction[] = [];

    // Loop for multi-step execution (ReAct pattern)
    while (steps < maxSteps) {
      steps++;

      const response = await toolLLM.invoke(messages);
      messages.push(response);

      if (!response.tool_calls || response.tool_calls.length === 0) {
        const { cleanContent, actions } = this.extractAISuggestions(
          response.content as unknown
        );
        return {
          content: cleanContent,
          artifacts: allArtifacts,
          suggestedActions: [...allSuggestedActions, ...actions],
        };
      }

      // Execute tools
      const toolResult = await this.toolHandler.executeCalls(
        response.tool_calls
      );

      // Accumulate side effects
      if (toolResult.artifacts) allArtifacts.push(...toolResult.artifacts);
      if (toolResult.suggestedActions)
        allSuggestedActions.push(...toolResult.suggestedActions);

      const observationText = toolResult.observations.join("\n\n");

      messages.push(
        new HumanMessage(
          `Tool Execution Result:\n${observationText}\n\nContinue executing if needed, or answer the user.`
        )
      );
    }

    return {
      content: "Execution limit reached.",
      artifacts: allArtifacts,
      suggestedActions: allSuggestedActions,
    };
  }

  private extractAISuggestions(content: unknown): {
    cleanContent: string;
    actions: SuggestedAction[];
  } {
    let textContent = "";

    if (typeof content === "string") {
      textContent = content;
    } else if (Array.isArray(content)) {
      textContent = content
        .map((c) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object" && "text" in c) return c.text;
          return "";
        })
        .join("");
    } else {
      textContent = String(content || "");
    }

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
      console.warn("[QueryWorkflow] Failed to parse suggested actions:", e);
      return { cleanContent: textContent, actions: [] };
    }
  }
}
