import { ContextManager } from "@locusai/ai-sdk";
import {
  AddComment,
  AddCommentSchema,
  CommentResponse,
  CreateTask,
  CreateTaskSchema,
  MembershipRole,
  TaskResponse,
  TasksResponse,
  UpdateTask,
  UpdateTaskSchema,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUserId, MembershipRoles } from "@/auth/decorators";
import { MembershipRolesGuard } from "@/auth/guards";
import { ZodValidationPipe } from "@/common/pipes";
import { WorkspacesService } from "@/workspaces/workspaces.service";
import { TasksService } from "./tasks.service";

@Controller("workspaces/:workspaceId/tasks")
@UseGuards(MembershipRolesGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => WorkspacesService))
    private readonly workspacesService: WorkspacesService
  ) {}

  @Get()
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async list(
    @Param("workspaceId") workspaceId: string
  ): Promise<TasksResponse> {
    await this.workspacesService.findById(workspaceId);
    const tasks = await this.tasksService.findAll(workspaceId);
    return { tasks };
  }

  @Get("backlog")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async getBacklog(
    @Param("workspaceId") workspaceId: string
  ): Promise<TasksResponse> {
    await this.workspacesService.findById(workspaceId);
    const tasks = await this.tasksService.findBacklog(workspaceId);
    return { tasks };
  }

  @Get(":taskId")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async getById(@Param("taskId") taskId: string): Promise<TaskResponse> {
    const task = await this.tasksService.findById(taskId);
    return { task };
  }

  @Post()
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async create(
    @CurrentUserId() userId: string | null,
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(CreateTaskSchema)) body: CreateTask
  ): Promise<TaskResponse> {
    await this.workspacesService.findById(workspaceId);

    const task = await this.tasksService.create({
      workspaceId,
      title: body.title,
      description: body.description ?? undefined,
      status: body.status,
      priority: body.priority,
      labels: body.labels,
      assigneeRole: body.assigneeRole ?? undefined,
      parentId: body.parentId ?? undefined,
      sprintId: body.sprintId ?? undefined,
      acceptanceChecklist: body.acceptanceChecklist,
      userId: userId ?? undefined,
    });
    return { task };
  }

  @Patch(":taskId")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async update(
    @CurrentUserId() userId: string | null,
    @Param("taskId") taskId: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema)) body: UpdateTask
  ): Promise<TaskResponse> {
    const updated = await this.tasksService.update(
      taskId,
      body,
      userId ?? undefined
    );
    return { task: updated };
  }

  @Delete(":taskId")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async delete(
    @CurrentUserId() userId: string | null,
    @Param("taskId") taskId: string
  ) {
    await this.tasksService.delete(taskId, userId ?? undefined);
    return { success: true };
  }

  @Post(":taskId/comment")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async addComment(
    @CurrentUserId() userId: string | null,
    @Param("taskId") taskId: string,
    @Body(new ZodValidationPipe(AddCommentSchema)) body: AddComment
  ): Promise<CommentResponse> {
    const comment = await this.tasksService.addComment(
      taskId,
      body.author,
      body.text,
      userId ?? undefined
    );
    return { comment };
  }

  @Get(":taskId/context")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async getTaskContext(@Param("taskId") taskId: string): Promise<string> {
    const task = await this.tasksService.findById(taskId);
    const workspace = await this.workspacesService.findById(task.workspaceId);

    return ContextManager.formatTaskContextForLocalAI(
      {
        title: task.title,
        description: task.description,
        status: task.status,
      },
      workspace.projectManifest
    );
  }
}
