import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { type AIArtifact, type SuggestedAction } from "@locusai/shared";
import { createManifestUpdaterChain } from "../chains/manifest-updater";
import { REQUIRED_MANIFEST_FIELDS } from "../constants";
import {
  AgentMode,
  type AgentResponse,
  type AgentState,
  type ProjectManifest,
} from "../interfaces/index";
import { ILocusProvider } from "../tools/interfaces";
import { CompilingWorkflow } from "../workflows/compiling";
import { ProductDocumentingWorkflow } from "../workflows/documenting_product";
import { TechnicalDocumentingWorkflow } from "../workflows/documenting_technical";
import { IdeaWorkflow } from "../workflows/idea";
import { InterviewWorkflow } from "../workflows/interview";
import { QueryWorkflow } from "../workflows/query";
import { DocumentCompiler } from "./compiler";
import { WorkflowEngine } from "./engine";
import { type LLMConfig, LLMFactory } from "./llm-factory";
import { ToolHandler } from "./tool-handler";

export interface AgentSettings extends LLMConfig {
  initialState?: Partial<AgentState>;
  locusProvider?: ILocusProvider;
  workspaceId?: string;
}

export class LocusAgent {
  private llm: BaseChatModel;
  private state: AgentState;
  private locusProvider?: ILocusProvider;
  private workspaceId?: string;
  private toolHandler?: ToolHandler;
  private compiler?: DocumentCompiler;
  private engine: WorkflowEngine;

  constructor(settings: AgentSettings = {}) {
    this.llm = LLMFactory.create(settings);
    this.locusProvider = settings.locusProvider;
    this.workspaceId = settings.workspaceId;
    this.state = this.initializeState(settings.initialState);

    this.engine = new WorkflowEngine(this.llm, this.workspaceId);
    this.setupWorkflows();
  }

  private setupWorkflows() {
    this.engine.registerWorkflow(new InterviewWorkflow());

    if (this.locusProvider && this.workspaceId) {
      this.compiler = new DocumentCompiler(this.llm);
      this.toolHandler = new ToolHandler(
        this.locusProvider,
        this.workspaceId,
        this.compiler
      );

      this.engine.registerWorkflow(
        new QueryWorkflow(
          this.locusProvider,
          this.workspaceId,
          this.toolHandler,
          this.compiler
        )
      );

      this.engine.registerWorkflow(
        new IdeaWorkflow(
          this.locusProvider,
          this.workspaceId,
          this.toolHandler,
          this.compiler
        )
      );

      this.engine.registerWorkflow(
        new ProductDocumentingWorkflow(
          this.locusProvider,
          this.workspaceId,
          this.toolHandler,
          this.compiler
        )
      );

      this.engine.registerWorkflow(
        new TechnicalDocumentingWorkflow(
          this.locusProvider,
          this.workspaceId,
          this.toolHandler,
          this.compiler
        )
      );

      this.engine.registerWorkflow(
        new CompilingWorkflow(
          this.locusProvider,
          this.workspaceId,
          this.toolHandler,
          this.compiler
        )
      );
    }
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
        // Merge updates
        this.state.manifest = {
          ...this.state.manifest,
          ...updates,
        };
        // Ensure arrays are merged or replaced?
        // The prompt says "Partial Manifest". Simple spread override is likely intended by the prompt logic.
        // However, we might want to be careful. For now, spread is standard.
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
    content: string,
    artifacts?: AIArtifact[],
    suggestedActions?: SuggestedAction[]
  ) {
    this.state.history.push({ role, content, artifacts, suggestedActions });
  }

  getState(): AgentState {
    return this.state;
  }

  async invoke(prompt: string): Promise<string> {
    const response = await this.llm.invoke(prompt);
    return response.content as string;
  }
}
