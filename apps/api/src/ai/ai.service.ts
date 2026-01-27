import { LocusAgent, ProjectManifest } from "@locusai/ai-sdk";
import { ILocusProvider } from "@locusai/ai-sdk/src/tools/interfaces";
import {
  AIMessage,
  ChatRequest,
  ChatResponse,
  CreateSprint,
  generateUUID,
  UpdateTask,
} from "@locusai/shared";
import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypedConfigService } from "../config/config.service";
import { DocsService } from "../docs/docs.service";
import { AiSession } from "../entities/ai-session.entity";
import { Workspace } from "../entities/workspace.entity";
import { SprintsService } from "../sprints/sprints.service";
import { TasksService } from "../tasks/tasks.service";

@Injectable()
export class AiService {
  constructor(
    private readonly config: TypedConfigService,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(AiSession)
    private readonly sessionRepo: Repository<AiSession>,
    private readonly tasksService: TasksService,
    private readonly docsService: DocsService,
    @Inject(forwardRef(() => SprintsService))
    private readonly sprintsService: SprintsService
  ) {}

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

    const agent = await this.getAgent(workspaceId, externalSessionId);

    // 3. Process Message
    const { content, artifacts } = await agent.handleMessage(request.message);
    const updatedState = agent.getState();

    // 4. Dual Persistence
    // ... global knowledge ...
    workspace.projectManifest = updatedState.manifest;
    workspace.agentState = {
      mode: updatedState.mode,
      missingInfo: updatedState.missingInfo,
    };

    // Update session context
    session.state = {
      mode: updatedState.mode,
      scratchpad: updatedState.scratchpad,
      missingInfo: updatedState.missingInfo,
      history: updatedState.history,
    };

    await Promise.all([
      this.workspaceRepo.save(workspace),
      this.sessionRepo.save(session),
    ]);

    // 5. Return Response
    const message: AIMessage = {
      id: generateUUID(),
      role: "assistant",
      content,
      artifacts,
      timestamp: new Date(),
    };

    return {
      message,
      sessionId: externalSessionId,
    };
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

  async getAgent(workspaceId: string, sessionId?: string): Promise<LocusAgent> {
    const locusProvider: ILocusProvider = {
      tasks: {
        create: (
          wid: string,
          data: Parameters<typeof this.tasksService.create>[0]
        ) => this.tasksService.create({ ...data, workspaceId: wid }),
        update: (id: string, _wid: string, data: Partial<UpdateTask>) =>
          this.tasksService.update(id, data),
        list: (wid: string) => this.tasksService.findRelevantTasks(wid),
        getById: (id: string) => this.tasksService.findById(id),
      },
      sprints: {
        create: (wid: string, data: CreateSprint) =>
          this.sprintsService.create({
            ...data,
            workspaceId: wid,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
          }),
        list: (wid: string) => this.sprintsService.findAll(wid),
        getById: (id: string) => this.sprintsService.findById(id),
        plan: (wid: string, sid: string) =>
          this.sprintsService.planSprintWithAi(sid, wid),
      },
      docs: {
        create: (
          wid: string,
          data: Parameters<typeof this.docsService.create>[0]
        ) => this.docsService.create({ ...data, workspaceId: wid }),
        update: (
          id: string,
          _wid: string,
          data: Parameters<typeof this.docsService.update>[1]
        ) => this.docsService.update(id, data),
        list: (wid: string) => this.docsService.findByWorkspace(wid),
        getById: (id: string) => this.docsService.findById(id),
      },
    };

    const [workspace, session] = await Promise.all([
      this.workspaceRepo.findOne({ where: { id: workspaceId } }),
      sessionId
        ? this.sessionRepo.findOne({
            where: { workspaceId, externalSessionId: sessionId },
          })
        : null,
    ]);

    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    return new LocusAgent({
      apiKey: this.config.get("GOOGLE_GENERATIVE_AI_API_KEY"),
      locusProvider: locusProvider,
      workspaceId,
      initialState: {
        manifest: (workspace.projectManifest as ProjectManifest) || undefined,
        history: session?.state?.history || [],
      },
    });
  }
}
