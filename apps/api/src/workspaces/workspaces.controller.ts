import {
  CreateWorkspace,
  CreateWorkspaceSchema,
  DispatchTask,
  DispatchTaskSchema,
  MembershipRole,
  OrgIdParam,
  OrgIdParamSchema,
  TaskResponse,
  UpdateWorkspace,
  UpdateWorkspaceSchema,
  WorkspaceIdParam,
  WorkspaceIdParamSchema,
  WorkspaceResponse,
  WorkspacesResponse,
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
import { CurrentUser, MembershipRoles } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import { User } from "@/entities/user.entity";
import { TasksService } from "@/tasks/tasks.service";
import { WorkspacesService } from "./workspaces.service";

@Controller("workspaces")
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService
  ) {}

  @Get()
  async listAll(@CurrentUser() user: User): Promise<WorkspacesResponse> {
    const workspaces = await this.workspacesService.findByUser(user.id);
    return { workspaces };
  }

  @Get("org/:orgId")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async list(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ): Promise<WorkspacesResponse> {
    const workspaces = await this.workspacesService.findByOrg(params.orgId);
    return { workspaces };
  }

  @Post()
  async createWithAutoOrg(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(CreateWorkspaceSchema)) body: CreateWorkspace
  ): Promise<WorkspaceResponse> {
    // Auto-create workspace with organization if user has none
    const workspace = await this.workspacesService.createWithAutoOrg(
      user.id,
      body.name
    );
    return { workspace };
  }

  @Post("org/:orgId")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async create(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(CreateWorkspaceSchema)) body: CreateWorkspace
  ): Promise<WorkspaceResponse> {
    // STRICT CONVENTION: orgId comes from URL params, not body
    const workspace = await this.workspacesService.create(
      params.orgId,
      body.name
    );
    return { workspace };
  }

  @Get(":workspaceId")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async getById(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ): Promise<WorkspaceResponse> {
    const workspace = await this.workspacesService.findById(params.workspaceId);
    return { workspace };
  }

  @Put(":workspaceId")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
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

  @Delete(":workspaceId")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async delete(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ) {
    await this.workspacesService.delete(params.workspaceId);
    return { success: true };
  }

  @Get(":workspaceId/stats")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async getStats(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ) {
    return this.workspacesService.getStats(params.workspaceId);
  }

  @Get(":workspaceId/activity")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
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

  @Post(":workspaceId/dispatch")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
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
    return { task };
  }
}
