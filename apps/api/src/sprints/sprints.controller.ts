import {
  CreateSprint,
  CreateSprintSchema,
  MembershipRole,
  SprintResponse,
  SprintsResponse,
  UpdateSprint,
  UpdateSprintSchema,
  User,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, MembershipRoles } from "@/auth/decorators";
import { MembershipRolesGuard } from "@/auth/guards";
import { ZodValidationPipe } from "@/common/pipes";
import { WorkspacesService } from "@/workspaces/workspaces.service";
import { SprintsService } from "./sprints.service";

@Controller("workspaces/:workspaceId/sprints")
@UseGuards(MembershipRolesGuard)
export class SprintsController {
  constructor(
    private readonly sprintsService: SprintsService,
    private readonly workspacesService: WorkspacesService
  ) {}

  private _toDate(
    val: string | number | Date | null | undefined
  ): Date | null | undefined {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (val instanceof Date) return val;
    return new Date(val);
  }

  @Get()
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async list(
    @Param("workspaceId") workspaceId: string
  ): Promise<SprintsResponse> {
    await this.workspacesService.findById(workspaceId);
    const sprints = await this.sprintsService.findAll(workspaceId);
    return { sprints };
  }

  @Get("active")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async getActive(
    @Param("workspaceId") workspaceId: string
  ): Promise<SprintResponse> {
    await this.workspacesService.findById(workspaceId);
    const sprint = await this.sprintsService.findActive(workspaceId);

    if (!sprint) {
      throw new Error("No active sprint found");
    }

    return { sprint };
  }

  @Get(":sprintId")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async getById(@Param("sprintId") sprintId: string): Promise<SprintResponse> {
    const sprint = await this.sprintsService.findById(sprintId);
    return { sprint };
  }

  @Post()
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(CreateSprintSchema)) body: CreateSprint
  ): Promise<SprintResponse> {
    const sprint = await this.sprintsService.create({
      name: body.name,
      workspaceId,
      startDate: this._toDate(body.startDate) ?? undefined,
      endDate: this._toDate(body.endDate) ?? undefined,
      taskIds: body.taskIds,
    });
    return { sprint };
  }

  @Patch(":sprintId")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async update(
    @Param("sprintId") sprintId: string,
    @Body(new ZodValidationPipe(UpdateSprintSchema)) body: UpdateSprint
  ): Promise<SprintResponse> {
    const updatedSprint = await this.sprintsService.update(sprintId, {
      ...body,
      startDate: this._toDate(body.startDate),
      endDate: this._toDate(body.endDate),
      mindmapUpdatedAt: this._toDate(body.mindmapUpdatedAt),
    });
    return { sprint: updatedSprint };
  }

  @Post(":sprintId/start")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async start(
    @CurrentUser() user: User,
    @Param("sprintId") sprintId: string
  ): Promise<SprintResponse> {
    const sprint = await this.sprintsService.startSprint(sprintId, user.id);
    return { sprint };
  }

  @Post(":sprintId/complete")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async complete(
    @CurrentUser() user: User,
    @Param("sprintId") sprintId: string
  ): Promise<SprintResponse> {
    const sprint = await this.sprintsService.completeSprint(sprintId, user.id);
    return { sprint };
  }

  @Delete(":sprintId")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async delete(@Param("sprintId") sprintId: string) {
    await this.sprintsService.delete(sprintId);
    return { success: true };
  }

  @Post(":sprintId/trigger-ai-planning")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async triggerAIPlanning(
    @Param("sprintId") sprintId: string,
    @Param("workspaceId") workspaceId: string
  ): Promise<SprintResponse> {
    const sprint = await this.sprintsService.planSprintWithAi(
      sprintId,
      workspaceId
    );
    return { sprint };
  }
}
