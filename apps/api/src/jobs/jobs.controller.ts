import {
  CreateJobRun,
  CreateJobRunSchema,
  JobStatus,
  JobType,
  UpdateJobRun,
  UpdateJobRunSchema,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { Member } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import {
  CreateJobRunRequestDto,
  JobRunResponseDto,
  JobRunsResponseDto,
  UpdateJobRunRequestDto,
} from "@/common/swagger/public-api.dto";
import { JobsService } from "./jobs.service";

@ApiTags("Job Runs")
@ApiBearerAuth("bearer")
@ApiSecurity("apiKey")
@Controller("workspaces/:workspaceId/job-runs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({ summary: "Create a new job run" })
  @ApiBody({ type: CreateJobRunRequestDto })
  @ApiCreatedResponse({
    description: "Job run created successfully",
    type: JobRunResponseDto,
  })
  @Post()
  @Member()
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(CreateJobRunSchema)) body: CreateJobRun
  ) {
    const jobRun = await this.jobsService.create(workspaceId, body);
    return { jobRun };
  }

  @ApiOperation({ summary: "List job runs in a workspace" })
  @ApiQuery({ name: "type", enum: JobType, required: false })
  @ApiQuery({ name: "status", enum: JobStatus, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiOkResponse({
    description: "Job runs fetched successfully",
    type: JobRunsResponseDto,
  })
  @Get()
  @Member()
  async list(
    @Param("workspaceId") workspaceId: string,
    @Query("type") type?: JobType,
    @Query("status") status?: JobStatus,
    @Query("limit") limit?: string
  ) {
    const jobRuns = await this.jobsService.findByWorkspace(workspaceId, {
      type,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { jobRuns };
  }

  @ApiOperation({ summary: "Get a job run by ID" })
  @ApiOkResponse({
    description: "Job run fetched successfully",
    type: JobRunResponseDto,
  })
  @Get(":id")
  @Member()
  async getById(@Param("id") id: string) {
    const jobRun = await this.jobsService.findOne(id);
    return { jobRun };
  }

  @ApiOperation({ summary: "Update a job run" })
  @ApiBody({ type: UpdateJobRunRequestDto })
  @ApiOkResponse({
    description: "Job run updated successfully",
    type: JobRunResponseDto,
  })
  @Patch(":id")
  @Member()
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateJobRunSchema)) body: UpdateJobRun
  ) {
    const jobRun = await this.jobsService.update(id, body);
    return { jobRun };
  }
}
