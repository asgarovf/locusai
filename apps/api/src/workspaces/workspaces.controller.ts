import {
  CreateWorkspace,
  CreateWorkspaceSchema,
  MembershipRole,
  OrgIdParam,
  OrgIdParamSchema,
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
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, MembershipRoles } from "@/auth/decorators";
import { JwtAuthGuard, MembershipRolesGuard } from "@/auth/guards";
import { ZodValidationPipe } from "@/common/pipes";
import { User } from "@/entities";
import { WorkspacesService } from "./workspaces.service";

@Controller("workspaces")
@UseGuards(JwtAuthGuard, MembershipRolesGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

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
      body.name
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
}
