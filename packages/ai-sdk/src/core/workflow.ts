import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIArtifact, SuggestedAction } from "@locusai/shared";
import { Intent } from "../chains/intent";
import { AgentMode, AgentResponse, AgentState } from "../interfaces/index";

export interface WorkflowContext {
  llm: BaseChatModel;
  state: AgentState;
  input: string;
  intent: Intent;
  workspaceId?: string;
}

export abstract class BaseWorkflow {
  abstract readonly name: string;
  abstract readonly mode: AgentMode;

  abstract canHandle(context: WorkflowContext): boolean;
  abstract execute(context: WorkflowContext): Promise<AgentResponse>;

  protected updateWorkflowState(state: AgentState, artifacts: AIArtifact[]) {
    if (!state.workflow) return;

    const newEntities = artifacts
      .filter((a) => ["document", "task", "sprint"].includes(a.type))
      .map((a) => ({
        id: a.id,
        type: a.type as "document" | "task" | "sprint",
        title: a.title,
        createdAt: new Date().toISOString(),
      }));

    for (const entity of newEntities) {
      if (!state.workflow.createdEntities.find((e) => e.id === entity.id)) {
        state.workflow.createdEntities.push(entity);
      }
    }
  }

  protected extractAISuggestions(content: unknown): {
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
      console.warn(`[${this.name}] Failed to parse suggested actions:`, e);
      return { cleanContent: textContent, actions: [] };
    }
  }
}
