import { AgentState, LocusAgent, ProjectManifest } from "@locusai/ai-sdk";
import {
  AIMessage,
  ChatRequest,
  ChatResponse,
  generateUUID,
  ProjectManifestType,
} from "@locusai/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypedConfigService } from "../config/config.service";
import { AiSession } from "../entities/ai-session.entity";
import { Workspace } from "../entities/workspace.entity";
import { InterviewAnalyticsService } from "../workspaces/interview-analytics.service";
import { ManifestValidatorService } from "../workspaces/manifest-validator.service";
import { AiProviderFactory } from "./ai-provider.factory";

@Injectable()
export class AiService {
  constructor(
    private readonly config: TypedConfigService,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(AiSession)
    private readonly sessionRepo: Repository<AiSession>,
    private readonly providerFactory: AiProviderFactory,
    private readonly manifestValidator: ManifestValidatorService,
    private readonly interviewAnalytics: InterviewAnalyticsService
  ) {}

  async detectIntent(
    workspaceId: string,
    userId: string,
    request: ChatRequest
  ): Promise<{ intent: string; executionId: string; sessionId: string }> {
    const externalSessionId = request.sessionId || generateUUID();

    // 1. Load Workspace & Session
    const [workspace, existingSession] = await Promise.all([
      this.workspaceRepo.findOne({ where: { id: workspaceId } }),
      this.sessionRepo.findOne({ where: { workspaceId, externalSessionId } }),
    ]);

    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    let session = existingSession;
    if (!session) {
      session = this.sessionRepo.create({
        workspaceId,
        userId,
        externalSessionId,
        state: {},
      });
      await this.sessionRepo.save(session);
    }

    const agent = await this.getAgent(workspace, session);

    // 2. Detect Intent
    const { intent, executionId } = await agent.detectIntent(request.message);
    const updatedState = agent.getState();

    // 3. Persist State (including pending execution)
    await this.persistState(workspace, session, updatedState);

    return {
      intent,
      executionId,
      sessionId: externalSessionId,
    };
  }

  async executeIntent(
    workspaceId: string,
    sessionId: string,
    executionId: string
  ): Promise<ChatResponse> {
    // 1. Load Workspace & Session
    const [workspace, session] = await Promise.all([
      this.workspaceRepo.findOne({ where: { id: workspaceId } }),
      this.sessionRepo.findOne({
        where: { workspaceId, externalSessionId: sessionId },
      }),
    ]);

    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const agent = await this.getAgent(workspace, session);

    // 2. Execute Pending Intent
    const response = await agent.executePending(executionId);
    const updatedState = agent.getState();

    // 3. Persist State
    await this.persistState(workspace, session, updatedState);

    // 4. Return Response
    const message: AIMessage = {
      id: generateUUID(),
      role: "assistant",
      content: response.content,
      artifacts: response.artifacts,
      suggestedActions: response.suggestedActions,
      timestamp: new Date(),
    };

    return {
      message,
      sessionId: sessionId,
    };
  }

  async chat(
    workspaceId: string,
    userId: string,
    request: ChatRequest
  ): Promise<ChatResponse> {
    const externalSessionId = request.sessionId || generateUUID();

    // 1. Load Workspace (Intelligence) & Session (Context)
    const [workspace, existingSession] = await Promise.all([
      this.workspaceRepo.findOne({ where: { id: workspaceId } }),
      this.sessionRepo.findOne({ where: { workspaceId, externalSessionId } }),
    ]);

    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    let session = existingSession;
    if (!session) {
      session = this.sessionRepo.create({
        workspaceId,
        userId,
        externalSessionId,
        state: {},
      });
      await this.sessionRepo.save(session);
    }

    const agent = await this.getAgent(workspace, session);

    // 3. Process Message
    const response = await agent.handleMessage(request.message);
    const updatedState = agent.getState();

    // 4. Persistence
    await this.persistState(workspace, session, updatedState);

    // 5. Return Response
    const message: AIMessage = {
      id: generateUUID(),
      role: "assistant",
      content: response.content,
      artifacts: response.artifacts,
      suggestedActions: response.suggestedActions,
      timestamp: new Date(),
    };

    return {
      message,
      sessionId: externalSessionId,
    };
  }

  private async persistState(
    workspace: Workspace,
    session: AiSession,
    updatedState: AgentState
  ) {
    // Capture old manifest for analytics comparison
    const oldManifest =
      workspace.projectManifest as Partial<ProjectManifestType>;

    // Validate and repair manifest before persisting
    const validationResult = this.manifestValidator.validateAndRepair(
      updatedState.manifest as Partial<ProjectManifestType>,
      workspace.id
    );

    const newManifest = validationResult.manifest;

    workspace.projectManifest = newManifest;
    workspace.agentState = {
      mode: updatedState.mode,
      missingInfo: updatedState.missingInfo,
    };

    session.state = {
      mode: updatedState.mode,
      scratchpad: updatedState.scratchpad,
      missingInfo: updatedState.missingInfo,
      history: updatedState.history,
      pendingExecution: updatedState.pendingExecution,
    };

    await Promise.all([
      this.workspaceRepo.save(workspace),
      this.sessionRepo.save(session),
    ]);

    // Track manifest changes for interview analytics (non-blocking)
    this.interviewAnalytics
      .trackManifestProgress(
        workspace,
        oldManifest,
        newManifest,
        session.userId
      )
      .catch((error) => {
        // Log but don't fail the main operation
        console.error("Failed to track interview analytics:", error);
      });
  }

  async getSession(
    workspaceId: string,
    externalSessionId: string
  ): Promise<AiSession | null> {
    return this.sessionRepo.findOne({
      where: { workspaceId, externalSessionId },
    });
  }

  async findSessionsByUser(
    workspaceId: string,
    userId: string
  ): Promise<AiSession[]> {
    return this.sessionRepo.find({
      where: { workspaceId, userId },
      order: { updatedAt: "DESC" },
    });
  }

  async deleteSession(
    workspaceId: string,
    userId: string,
    externalSessionId: string
  ): Promise<void> {
    const result = await this.sessionRepo.delete({
      workspaceId,
      userId,
      externalSessionId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Session ${externalSessionId} not found`);
    }
  }

  async shareSession(
    workspaceId: string,
    userId: string,
    externalSessionId: string,
    isShared: boolean
  ): Promise<void> {
    const result = await this.sessionRepo.update(
      { workspaceId, userId, externalSessionId },
      { isShared }
    );

    if (result.affected === 0) {
      throw new NotFoundException(`Session ${externalSessionId} not found`);
    }
  }

  async getSharedSession(externalSessionId: string): Promise<AiSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { externalSessionId, isShared: true },
    });
    return session;
  }

  async getAgent(
    workspace: Workspace | string,
    session?: AiSession,
    userId?: string
  ): Promise<LocusAgent> {
    let workspaceEntity: Workspace | null = null;

    if (typeof workspace === "string") {
      workspaceEntity = await this.workspaceRepo.findOne({
        where: { id: workspace },
      });
      if (!workspaceEntity) {
        throw new NotFoundException(`Workspace ${workspace} not found`);
      }
    } else {
      workspaceEntity = workspace;
    }

    // Validate and repair manifest on fetch
    const validationResult = this.manifestValidator.validateAndRepair(
      workspaceEntity.projectManifest as Partial<ProjectManifestType>,
      workspaceEntity.id
    );

    // If manifest was repaired, persist the changes
    if (validationResult.wasRepaired && validationResult.manifest) {
      workspaceEntity.projectManifest = validationResult.manifest;
      await this.workspaceRepo.save(workspaceEntity);
    }

    return new LocusAgent({
      apiKey: this.config.get("GOOGLE_GENERATIVE_AI_API_KEY"),
      workspaceId: workspaceEntity.id,
      initialState: {
        manifest:
          (workspaceEntity.projectManifest as ProjectManifest) || undefined,
        history: session?.state?.history || [],
        mode: session?.state?.mode || undefined,
        missingInfo: session?.state?.missingInfo || undefined,
        pendingExecution: session?.state?.pendingExecution || undefined,
      },
    });
  }
}
