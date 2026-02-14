import {
  AddComment,
  AddCommentSchema,
  CommentResponse,
  CreateTask,
  CreateTaskSchema,
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
import { CurrentUserId, Member, MemberAdmin } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import {
  AddCommentRequestDto,
  BatchUpdateTasksRequestDto,
  CommentResponseDto,
  CreateTaskRequestDto,
  SuccessResponseDto,
  TaskResponseDto,
  TasksResponseDto,
  UpdateTaskRequestDto,
} from "@/common/swagger/public-api.dto";
import { Task } from "@/entities";
import { WorkspacesService } from "@/workspaces/workspaces.service";
import { TasksService } from "./tasks.service";

@ApiTags("Tasks")
@ApiBearerAuth("bearer")
@ApiSecurity("apiKey")
@Controller("workspaces/:workspaceId/tasks")
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => WorkspacesService))
    private readonly workspacesService: WorkspacesService
  ) {}

  @ApiOperation({ summary: "List tasks in a workspace" })
  @ApiOkResponse({
    description: "Tasks fetched successfully",
    type: TasksResponseDto,
  })
  @Get()
  @Member()
  async list(
    @Param("workspaceId") workspaceId: string
  ): Promise<TasksResponse> {
    await this.workspacesService.findById(workspaceId);
    const tasks = await this.tasksService.findAll(workspaceId);

    const tasksResponse = tasks.map((task) => this.taskToTaskResponse(task));
    return { tasks: tasksResponse };
  }

  @ApiOperation({ summary: "List backlog tasks in a workspace" })
  @ApiOkResponse({
    description: "Backlog tasks fetched successfully",
    type: TasksResponseDto,
  })
  @Get("backlog")
  @Member()
  async getBacklog(
    @Param("workspaceId") workspaceId: string
  ): Promise<TasksResponse> {
    await this.workspacesService.findById(workspaceId);
    const tasks = await this.tasksService.findBacklog(workspaceId);

    const tasksResponse = tasks.map((task) => this.taskToTaskResponse(task));
    return { tasks: tasksResponse };
  }

  @ApiOperation({ summary: "Get a task by ID" })
  @ApiOkResponse({
    description: "Task fetched successfully",
    type: TaskResponseDto,
  })
  @Get(":taskId")
  @Member()
  async getById(@Param("taskId") taskId: string): Promise<TaskResponse> {
    const task = await this.tasksService.findById(taskId);
    return { task: this.taskToTaskResponse(task) };
  }

  @ApiOperation({ summary: "Create a new task in a workspace" })
  @ApiBody({ type: CreateTaskRequestDto })
  @ApiCreatedResponse({
    description: "Task created successfully",
    type: TaskResponseDto,
  })
  @Post()
  @Member()
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
      order: body.order ?? undefined,
    });
    return { task: this.taskToTaskResponse(task) };
  }

  @ApiOperation({ summary: "Update a task" })
  @ApiBody({ type: UpdateTaskRequestDto })
  @ApiOkResponse({
    description: "Task updated successfully",
    type: TaskResponseDto,
  })
  @Patch(":taskId")
  @Member()
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
    return { task: this.taskToTaskResponse(updated) };
  }

  @ApiOperation({ summary: "Batch update multiple tasks" })
  @ApiBody({ type: BatchUpdateTasksRequestDto })
  @ApiOkResponse({
    description: "Batch update applied successfully",
    type: SuccessResponseDto,
  })
  @Patch("batch")
  @Member()
  async batchUpdate(
    @Param("workspaceId") workspaceId: string,
    @Body() body: { ids: string[]; updates: UpdateTask }
  ) {
    await this.tasksService.batchUpdate(body.ids, workspaceId, body.updates);
    return { success: true };
  }

  @ApiOperation({ summary: "Delete a task" })
  @ApiOkResponse({
    description: "Task deleted successfully",
    type: SuccessResponseDto,
  })
  @Delete(":taskId")
  @MemberAdmin()
  async delete(
    @CurrentUserId() userId: string | null,
    @Param("taskId") taskId: string
  ) {
    await this.tasksService.delete(taskId, userId ?? undefined);
    return { success: true };
  }

  @ApiOperation({ summary: "Add a comment to a task" })
  @ApiBody({ type: AddCommentRequestDto })
  @ApiCreatedResponse({
    description: "Comment added successfully",
    type: CommentResponseDto,
  })
  @Post(":taskId/comment")
  @Member()
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

  taskToTaskResponse(task: Task): TaskResponse["task"] {
    return {
      ...task,
      dueDate: task.dueDate ? task.dueDate.getTime() : null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
