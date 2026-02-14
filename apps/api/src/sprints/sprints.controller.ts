import {
  CreateSprint,
  CreateSprintSchema,
  SprintResponse,
  SprintsResponse,
  UpdateSprint,
  UpdateSprintSchema,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUserId, Member } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import {
  CreateSprintRequestDto,
  SprintResponseDto,
  SprintsResponseDto,
  SuccessResponseDto,
  UpdateSprintRequestDto,
} from "@/common/swagger/public-api.dto";
import { WorkspacesService } from "@/workspaces/workspaces.service";
import { SprintsService } from "./sprints.service";

@ApiTags("Sprints")
@ApiBearerAuth("bearer")
@ApiSecurity("apiKey")
@Controller("workspaces/:workspaceId/sprints")
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

  @ApiOperation({ summary: "List sprints in a workspace" })
  @ApiOkResponse({
    description: "Sprints fetched successfully",
    type: SprintsResponseDto,
  })
  @Get()
  @Member()
  async list(
    @Param("workspaceId") workspaceId: string
  ): Promise<SprintsResponse> {
    await this.workspacesService.findById(workspaceId);
    const sprints = await this.sprintsService.findAll(workspaceId);
    return { sprints };
  }

  @ApiOperation({ summary: "Get the active sprint for a workspace" })
  @ApiOkResponse({
    description: "Active sprint fetched successfully",
    type: SprintResponseDto,
  })
  @Get("active")
  @Member()
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

  @ApiOperation({ summary: "Get a sprint by ID" })
  @ApiOkResponse({
    description: "Sprint fetched successfully",
    type: SprintResponseDto,
  })
  @Get(":sprintId")
  @Member()
  async getById(@Param("sprintId") sprintId: string): Promise<SprintResponse> {
    const sprint = await this.sprintsService.findById(sprintId);
    return { sprint };
  }

  @ApiOperation({ summary: "Create a new sprint" })
  @ApiBody({ type: CreateSprintRequestDto })
  @ApiCreatedResponse({
    description: "Sprint created successfully",
    type: SprintResponseDto,
  })
  @Post()
  @Member()
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

  @ApiOperation({ summary: "Update a sprint" })
  @ApiBody({ type: UpdateSprintRequestDto })
  @ApiOkResponse({
    description: "Sprint updated successfully",
    type: SprintResponseDto,
  })
  @Patch(":sprintId")
  @Member()
  async update(
    @Param("sprintId") sprintId: string,
    @Body(new ZodValidationPipe(UpdateSprintSchema)) body: UpdateSprint
  ): Promise<SprintResponse> {
    const updatedSprint = await this.sprintsService.update(sprintId, {
      ...body,
      startDate: this._toDate(body.startDate),
      endDate: this._toDate(body.endDate),
    });
    return { sprint: updatedSprint };
  }

  @ApiOperation({ summary: "Start a sprint" })
  @ApiCreatedResponse({
    description: "Sprint started successfully",
    type: SprintResponseDto,
  })
  @Post(":sprintId/start")
  @Member()
  async start(
    @CurrentUserId() userId: string | null,
    @Param("sprintId") sprintId: string
  ): Promise<SprintResponse> {
    const sprint = await this.sprintsService.startSprint(
      sprintId,
      userId ?? undefined
    );
    return { sprint };
  }

  @ApiOperation({ summary: "Complete a sprint" })
  @ApiCreatedResponse({
    description: "Sprint completed successfully",
    type: SprintResponseDto,
  })
  @Post(":sprintId/complete")
  @Member()
  async complete(
    @CurrentUserId() userId: string | null,
    @Param("sprintId") sprintId: string
  ): Promise<SprintResponse> {
    const sprint = await this.sprintsService.completeSprint(
      sprintId,
      userId ?? undefined
    );
    return { sprint };
  }

  @ApiOperation({ summary: "Delete a sprint" })
  @ApiOkResponse({
    description: "Sprint deleted successfully",
    type: SuccessResponseDto,
  })
  @Delete(":sprintId")
  @Member()
  async delete(@Param("sprintId") sprintId: string) {
    await this.sprintsService.delete(sprintId);
    return { success: true };
  }
}
