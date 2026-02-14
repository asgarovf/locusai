import {
  AgentHeartbeat,
  AgentHeartbeatSchema,
  CreateWorkspace,
  CreateWorkspaceSchema,
  DispatchTask,
  DispatchTaskSchema,
  OrgIdParam,
  OrgIdParamSchema,
  TaskResponse,
  UpdateWorkspace,
  UpdateWorkspaceSchema,
  WorkspaceIdParam,
  WorkspaceIdParamSchema,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { z } from "zod";
import { CurrentUser, Member, MemberAdmin } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import {
  AgentHeartbeatRequestDto,
  AgentHeartbeatResponseDto,
  AgentsListResponseDto,
  ApiKeyCreateResponseDto,
  ApiKeyNameRequestDto,
  ApiKeysResponseDto,
  CreateWorkspaceRequestDto,
  DispatchTaskRequestDto,
  SuccessResponseDto,
  TaskResponseDto,
  UpdateWorkspaceRequestDto,
  WorkspaceActivityResponseDto,
  WorkspaceResponseDto,
  WorkspaceStatsDto,
  WorkspacesResponseDto,
} from "@/common/swagger/public-api.dto";
import { Task } from "@/entities";
import { User } from "@/entities/user.entity";
import { TasksService } from "@/tasks/tasks.service";
import { WorkspacesService } from "./workspaces.service";

@ApiTags("Workspaces")
@ApiBearerAuth("bearer")
@ApiSecurity("apiKey")
@Controller("workspaces")
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService
  ) {}

  @ApiOperation({ summary: "List workspaces for the current user" })
  @ApiOkResponse({
    description: "Workspaces fetched successfully",
    type: WorkspacesResponseDto,
  })
  @Get()
  async listAll(@CurrentUser() user: User) {
    const workspaces = await this.workspacesService.findByUser(user.id);
    return { workspaces };
  }

  @ApiOperation({ summary: "List workspaces in an organization" })
  @ApiOkResponse({
    description: "Organization workspaces fetched successfully",
    type: WorkspacesResponseDto,
  })
  @Get("org/:orgId")
  @Member()
  async list(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ) {
    const workspaces = await this.workspacesService.findByOrg(params.orgId);
    return { workspaces };
  }

  @ApiOperation({
    summary: "Create a workspace with automatic organization setup",
  })
  @ApiBody({ type: CreateWorkspaceRequestDto })
  @ApiOkResponse({
    description: "Workspace created successfully",
    type: WorkspaceResponseDto,
  })
  @Post()
  async createWithAutoOrg(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(CreateWorkspaceSchema)) body: CreateWorkspace
  ) {
    const workspace = await this.workspacesService.createWithAutoOrg(
      user.id,
      body.name
    );
    if (!user.onboardingCompleted) {
      await this.workspacesService.markOnboardingCompleted(user.id);
    }
    return { workspace };
  }

  @ApiOperation({
    summary: "Create a workspace within an existing organization",
  })
  @ApiBody({ type: CreateWorkspaceRequestDto })
  @ApiOkResponse({
    description: "Workspace created successfully",
    type: WorkspaceResponseDto,
  })
  @Post("org/:orgId")
  @MemberAdmin()
  async create(
    @CurrentUser() user: User,
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(CreateWorkspaceSchema)) body: CreateWorkspace
  ) {
    const workspace = await this.workspacesService.create(
      params.orgId,
      body.name
    );
    if (!user.onboardingCompleted) {
      await this.workspacesService.markOnboardingCompleted(user.id);
    }
    return { workspace };
  }

  @ApiOperation({ summary: "Get workspace details by ID" })
  @ApiOkResponse({
    description: "Workspace fetched successfully",
    type: WorkspaceResponseDto,
  })
  @Get(":workspaceId")
  @Member()
  async getById(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ) {
    const workspace = await this.workspacesService.findById(params.workspaceId);
    return { workspace };
  }

  @ApiOperation({ summary: "Update workspace settings" })
  @ApiBody({ type: UpdateWorkspaceRequestDto })
  @ApiOkResponse({
    description: "Workspace updated successfully",
    type: WorkspaceResponseDto,
  })
  @Put(":workspaceId")
  @MemberAdmin()
  async update(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam,
    @Body(new ZodValidationPipe(UpdateWorkspaceSchema)) body: UpdateWorkspace
  ) {
    const workspace = await this.workspacesService.update(
      params.workspaceId,
      body
    );
    return { workspace };
  }

  @ApiOperation({ summary: "Delete a workspace" })
  @ApiOkResponse({
    description: "Workspace deleted successfully",
    type: SuccessResponseDto,
  })
  @Delete(":workspaceId")
  @MemberAdmin()
  async delete(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ) {
    await this.workspacesService.delete(params.workspaceId);
    return { success: true };
  }

  @ApiOperation({ summary: "Get workspace task/member statistics" })
  @ApiOkResponse({
    description: "Workspace statistics fetched successfully",
    type: WorkspaceStatsDto,
  })
  @Get(":workspaceId/stats")
  @Member()
  async getStats(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ) {
    return this.workspacesService.getStats(params.workspaceId);
  }

  @ApiOperation({ summary: "Get recent workspace activity events" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Maximum number of events to return (default 50)",
  })
  @ApiOkResponse({
    description: "Workspace activity fetched successfully",
    type: WorkspaceActivityResponseDto,
  })
  @Get(":workspaceId/activity")
  @Member()
  async getActivity(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam,
    @Query("limit") limit?: number
  ) {
    const activity = await this.workspacesService.getActivity(
      params.workspaceId,
      limit
    );
    return { activity };
  }

  @ApiOperation({ summary: "Dispatch the next available task to a worker" })
  @ApiBody({ type: DispatchTaskRequestDto })
  @ApiOkResponse({
    description: "Task dispatched successfully",
    type: TaskResponseDto,
  })
  @Post(":workspaceId/dispatch")
  @MemberAdmin()
  async dispatch(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam,
    @Body(new ZodValidationPipe(DispatchTaskSchema)) body: DispatchTask
  ): Promise<TaskResponse> {
    const task = await this.tasksService.dispatchTask(
      params.workspaceId,
      body.workerId || "system",
      body.sprintId
    );
    return { task: this.taskToTaskResponse(task) };
  }

  // ============================================================================
  // Agent Heartbeat & Registration
  // ============================================================================

  @ApiOperation({ summary: "Record or update agent heartbeat status" })
  @ApiBody({ type: AgentHeartbeatRequestDto })
  @ApiOkResponse({
    description: "Agent heartbeat recorded successfully",
    type: AgentHeartbeatResponseDto,
  })
  @Post(":workspaceId/agents/heartbeat")
  @MemberAdmin()
  async agentHeartbeat(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam,
    @Body(new ZodValidationPipe(AgentHeartbeatSchema)) body: AgentHeartbeat
  ) {
    const registration = await this.workspacesService.recordHeartbeat(
      params.workspaceId,
      body
    );
    return {
      agent: {
        agentId: registration.agentId,
        workspaceId: registration.workspaceId,
        currentTaskId: registration.currentTaskId,
        status: registration.status,
        lastHeartbeat: registration.lastHeartbeat.toISOString(),
        createdAt: registration.createdAt.toISOString(),
      },
    };
  }

  @ApiOperation({ summary: "List active agents in a workspace" })
  @ApiOkResponse({
    description: "Active agents fetched successfully",
    type: AgentsListResponseDto,
  })
  @Get(":workspaceId/agents")
  @Member()
  async listAgents(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ) {
    // Clean up stale registrations first
    await this.workspacesService.cleanupStaleAgents(params.workspaceId);

    const agents = await this.workspacesService.getActiveAgents(
      params.workspaceId
    );
    return {
      agents: agents.map((a) => ({
        agentId: a.agentId,
        workspaceId: a.workspaceId,
        currentTaskId: a.currentTaskId,
        status: a.status,
        lastHeartbeat: a.lastHeartbeat.toISOString(),
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  // ============================================================================
  // API Key Management
  // ============================================================================

  @ApiOperation({ summary: "List API keys for a workspace" })
  @ApiOkResponse({
    description: "Workspace API keys fetched successfully",
    type: ApiKeysResponseDto,
  })
  @Get(":workspaceId/api-keys")
  @MemberAdmin()
  async listApiKeys(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ) {
    const apiKeys = await this.workspacesService.listApiKeys(
      params.workspaceId
    );

    const maskedKeys = apiKeys.map((apiKey) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { keyHash: _, ...rest } = apiKey;
      return {
        ...rest,
        key: `${apiKey.keyPrefix}...`,
      };
    });
    return { apiKeys: maskedKeys };
  }

  @ApiOperation({ summary: "Create a new API key for a workspace" })
  @ApiBody({ type: ApiKeyNameRequestDto })
  @ApiOkResponse({
    description: "Workspace API key created successfully",
    type: ApiKeyCreateResponseDto,
  })
  @Post(":workspaceId/api-keys")
  @MemberAdmin()
  async createApiKey(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam,
    @Body(new ZodValidationPipe(z.object({ name: z.string().min(1).max(100) })))
    body: { name: string }
  ) {
    const { apiKey, key } = await this.workspacesService.createApiKey(
      params.workspaceId,
      body.name
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { keyHash: _, ...rest } = apiKey;

    // Return full key only on creation
    return {
      apiKey: {
        ...rest,
        key, // Full key returned only once
      },
    };
  }

  @ApiOperation({ summary: "Delete a workspace API key" })
  @ApiOkResponse({
    description: "Workspace API key deleted successfully",
    type: SuccessResponseDto,
  })
  @Delete(":workspaceId/api-keys/:keyId")
  @MemberAdmin()
  async deleteApiKey(
    @Param("workspaceId") workspaceId: string,
    @Param("keyId") keyId: string
  ) {
    await this.workspacesService.deleteApiKey(workspaceId, keyId);
    return { success: true };
  }

  private taskToTaskResponse(task: Task): TaskResponse["task"] {
    return {
      ...task,
      dueDate: task.dueDate ? task.dueDate.getTime() : null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
