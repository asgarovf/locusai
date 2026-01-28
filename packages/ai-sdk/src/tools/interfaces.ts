import {
  CreateDoc,
  CreateSprint,
  CreateTask,
  Doc,
  Sprint,
  Task,
  UpdateTask,
} from "@locusai/shared";

export interface ITaskProvider {
  create(
    workspaceId: string,
    data: CreateTask & { userId?: string; workspaceId?: string }
  ): Promise<Task>;
  update(id: string, workspaceId: string, data: UpdateTask): Promise<Task>;
  batchUpdate(
    ids: string[],
    workspaceId: string,
    data: UpdateTask
  ): Promise<void>;
  list(workspaceId: string, options?: { sprintId?: string }): Promise<Task[]>;
  getById(id: string, workspaceId: string): Promise<Task>;
}

export interface ISprintProvider {
  create(workspaceId: string, data: CreateSprint): Promise<Sprint>;
  list(workspaceId: string): Promise<Sprint[]>;
  getById(id: string, workspaceId: string): Promise<Sprint>;
  plan(workspaceId: string, sprintId: string): Promise<Sprint>;
}

export interface IDocProvider {
  create(workspaceId: string, data: CreateDoc): Promise<Doc>;
  update(
    id: string,
    workspaceId: string,
    data: Partial<CreateDoc>
  ): Promise<Doc>;
  list(workspaceId: string): Promise<Doc[]>;
  getById(id: string, workspaceId: string): Promise<Doc>;
}

export interface ILocusProvider {
  tasks: ITaskProvider;
  sprints: ISprintProvider;
  docs: IDocProvider;
}

// Tool Response Types
export interface ToolBaseResponse {
  success: boolean;
  message?: string;
  instruction?: string; // Guidance for the Agent on what to do next
  error?: string;
}

export interface TaskToolResult {
  id: string;
  title: string;
  status: string;
  description?: string;
}

export interface DocToolResult {
  id: string;
  title: string;
  content: string;
}

export interface SprintToolResult {
  id: string;
  name: string;
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface ToolResponse extends ToolBaseResponse {
  // Single Creation IDs
  taskId?: string;
  docId?: string;
  sprintId?: string;

  // List Data
  tasks?: TaskToolResult[];
  documents?: DocToolResult[];
  sprints?: SprintToolResult[];

  // Count
  count?: number;
}
