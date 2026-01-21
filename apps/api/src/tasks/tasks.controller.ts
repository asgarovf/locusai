import {
  AddComment,
  AddCommentSchema,
  CommentResponse,
  CreateTask,
  CreateTaskSchema,
  DispatchTask,
  DispatchTaskSchema,
  LockTask,
  LockTaskSchema,
  MembershipRole,
  TaskResponse,
  TasksResponse,
  UnlockTask,
  UnlockTaskSchema,
  UpdateTask,
  UpdateTaskSchema,
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
import { MembershipRoles } from "@/auth/decorators/membership-roles.decorator";
import { CurrentUser } from "@/auth/decorators/user.decorator";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { MembershipRolesGuard } from "@/auth/guards/membership-roles.guard";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { User } from "@/entities/user.entity";
import { WorkspacesService } from "@/workspaces/workspaces.service";
import { TasksService } from "./tasks.service";

@Controller("workspaces/:workspaceId/tasks")
@UseGuards(JwtAuthGuard, MembershipRolesGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
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
    @CurrentUser() user: User,
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
      userId: user.id,
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
    @CurrentUser() user: User,
    @Param("taskId") taskId: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema)) body: UpdateTask
  ): Promise<TaskResponse> {
    const updated = await this.tasksService.update(taskId, body, user.id);
    return { task: updated };
  }

  @Delete(":taskId")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async delete(@CurrentUser() user: User, @Param("taskId") taskId: string) {
    await this.tasksService.delete(taskId, user.id);
    return { success: true };
  }

  @Post(":taskId/comment")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async addComment(
    @CurrentUser() user: User,
    @Param("taskId") taskId: string,
    @Body(new ZodValidationPipe(AddCommentSchema)) body: AddComment
  ): Promise<CommentResponse> {
    const comment = await this.tasksService.addComment(
      taskId,
      body.author,
      body.text,
      user.id
    );
    return { comment };
  }

  @Post("dispatch")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async dispatch(
    @Body(new ZodValidationPipe(DispatchTaskSchema)) body: DispatchTask
  ): Promise<TaskResponse> {
    const task = await this.tasksService.dispatchTask(
      body.workerId || "system",
      body.sprintId
    );
    return { task };
  }

  @Post(":taskId/lock")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async lock(
    @CurrentUser() user: User,
    @Param("taskId") taskId: string,
    @Body(new ZodValidationPipe(LockTaskSchema)) body: LockTask
  ) {
    await this.tasksService.lockTask(
      taskId,
      body.agentId,
      body.ttlSeconds,
      user.id
    );
    return { success: true };
  }

  @Post(":taskId/unlock")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async unlock(
    @CurrentUser() user: User,
    @Param("taskId") taskId: string,
    @Body(new ZodValidationPipe(UnlockTaskSchema)) body: UnlockTask
  ) {
    await this.tasksService.unlockTask(taskId, body.agentId, user.id);
    return { success: true };
  }
}
