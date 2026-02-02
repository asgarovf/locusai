import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  type AIArtifact,
  generateUUID,
  type SuggestedAction,
} from "@locusai/shared";
import { Intent } from "../chains/intent";
import { createManifestUpdaterChain } from "../chains/manifest-updater";
import { REQUIRED_MANIFEST_FIELDS } from "../constants";
import {
  AgentMode,
  type AgentResponse,
  type AgentState,
  type ProjectManifest,
} from "../interfaces/index";
import { ProductDocumentingWorkflow } from "../workflows/documenting_product";
import { TechnicalDocumentingWorkflow } from "../workflows/documenting_technical";
import { IdeaWorkflow } from "../workflows/idea";
import { InterviewWorkflow } from "../workflows/interview";
import { QueryWorkflow } from "../workflows/query";
import { WorkflowEngine } from "./engine";
import { type LLMConfig, LLMFactory } from "./llm-factory";

export interface AgentSettings extends LLMConfig {
  initialState?: Partial<AgentState>;
  workspaceId?: string;
}

export class LocusAgent {
  private llm: BaseChatModel;
  private state: AgentState;
  private workspaceId?: string;
  private engine: WorkflowEngine;

  constructor(settings: AgentSettings = {}) {
    this.llm = LLMFactory.create(settings);
    this.workspaceId = settings.workspaceId;
    this.state = this.initializeState(settings.initialState);

    this.engine = new WorkflowEngine(this.llm, this.workspaceId);
    this.setupWorkflows();
  }

  private setupWorkflows() {
    // Register all conversational workflows
    this.engine.registerWorkflow(new InterviewWorkflow());
    this.engine.registerWorkflow(new QueryWorkflow());
    this.engine.registerWorkflow(new IdeaWorkflow());
    this.engine.registerWorkflow(new ProductDocumentingWorkflow());
    this.engine.registerWorkflow(new TechnicalDocumentingWorkflow());
  }

  private initializeState(initial?: Partial<AgentState>): AgentState {
    const defaultManifest: ProjectManifest = {
      name: "",
      mission: "",
      targetUsers: [],
      techStack: [],
      phase: "PLANNING",
      features: [],
      competitors: [],
      brandVoice: "",
      successMetrics: [],
      completenessScore: 0,
    };

    const manifest: ProjectManifest = {
      ...defaultManifest,
      ...initial?.manifest,
    };

    const requiredFields = REQUIRED_MANIFEST_FIELDS;

    const missingInfo =
      initial?.missingInfo ||
      requiredFields.filter((key) => {
        const value = manifest[key];
        if (Array.isArray(value)) return value.length === 0;
        return !value;
      });

    return {
      mode: AgentMode.IDLE,
      scratchpad: [],
      manifest,
      missingInfo,
      history: [],
      workflow: {
        currentIntent: "PLANNING",
        createdEntities: [],
        pendingActions: [],
        manifestSummary: "",
      },
      ...initial,
    };
  }

  async handleMessage(input: string): Promise<AgentResponse> {
    const response = await this.engine.execute(this.state, input);

    // Passively update manifest if not in Interview mode
    if (this.state.mode !== AgentMode.INTERVIEW) {
      this.updateManifestInBackground(input);
    }

    this.updateHistory("user", input);
    this.updateHistory(
      "assistant",
      response.content,
      response.artifacts,
      response.suggestedActions
    );

    return response;
  }

  async detectIntent(
    input: string
  ): Promise<{ intent: string; executionId: string }> {
    const intent = await this.engine.detectIntent(this.state, input);
    const executionId = generateUUID();

    this.state.pendingExecution = {
      intent,
      originalInput: input,
      executionId,
    };

    return { intent, executionId };
  }

  async executePending(executionId: string): Promise<AgentResponse> {
    if (
      !this.state.pendingExecution ||
      this.state.pendingExecution.executionId !== executionId
    ) {
      throw new Error("No matching pending execution found");
    }

    const { intent, originalInput } = this.state.pendingExecution;

    // Execute with the stored intent
    const response = await this.engine.execute(
      this.state,
      originalInput,
      intent as Intent
    );

    // Clear pending execution
    delete this.state.pendingExecution;

    // Passively update manifest if not in Interview mode
    if (this.state.mode !== AgentMode.INTERVIEW) {
      this.updateManifestInBackground(originalInput);
    }

    this.updateHistory("user", originalInput);
    this.updateHistory(
      "assistant",
      response.content,
      response.artifacts,
      response.suggestedActions
    );

    return response;
  }

  private async updateManifestInBackground(input: string) {
    try {
      const historyText = this.state.history
        .slice(-5)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const updaterChain = createManifestUpdaterChain(this.llm);
      const updates = await updaterChain.invoke({
        manifest: JSON.stringify(this.state.manifest),
        history: historyText,
        input,
      });

      if (Object.keys(updates).length > 0) {
        this.state.manifest = {
          ...this.state.manifest,
          ...updates,
        };
        console.log(
          "[LocusAgent] Passive Manifest Update:",
          JSON.stringify(updates, null, 2)
        );
      }
    } catch (e) {
      console.warn("[LocusAgent] Failed to update manifest in background:", e);
    }
  }

  private updateHistory(
    role: "user" | "assistant",
    content: string | undefined | null,
    artifacts?: AIArtifact[],
    suggestedActions?: SuggestedAction[]
  ) {
    const safeContent = typeof content === "string" ? content : "";
    this.state.history.push({
      role,
      content: safeContent,
      timestamp: new Date(),
      artifacts,
      suggestedActions,
    });
  }

  getState(): AgentState {
    return this.state;
  }

  async invoke(prompt: string): Promise<string> {
    const response = await this.llm.invoke(prompt);
    return response.content as string;
  }
}
