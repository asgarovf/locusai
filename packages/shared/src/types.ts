export enum TaskStatus {
  BACKLOG = "BACKLOG",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW",
  VERIFICATION = "VERIFICATION",
  DONE = "DONE",
  BLOCKED = "BLOCKED",
}

export enum AssigneeRole {
  BACKEND = "BACKEND",
  FRONTEND = "FRONTEND",
  QA = "QA",
  PM = "PM",
  DESIGN = "DESIGN",
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum EventType {
  TASK_CREATED = "TASK_CREATED",
  TASK_UPDATED = "TASK_UPDATED",
  STATUS_CHANGED = "STATUS_CHANGED",
  COMMENT_ADDED = "COMMENT_ADDED",
  ARTIFACT_ADDED = "ARTIFACT_ADDED",
  LOCKED = "LOCKED",
  UNLOCKED = "UNLOCKED",
  CI_RAN = "CI_RAN",
}

export interface AcceptanceItem {
  id: string;
  text: string;
  done: boolean;
}

export enum SprintStatus {
  PLANNED = "PLANNED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
}

export interface Sprint {
  id: number;
  name: string;
  status: SprintStatus;
  startDate?: number;
  endDate?: number;
  createdAt: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  assigneeRole?: AssigneeRole;
  assignedTo?: string | null;
  sprintId?: number | null;
  dueDate?: string | null;
  parentId?: number | null;
  lockedBy?: string | null;
  lockExpiresAt?: number | null;
  acceptanceChecklist: AcceptanceItem[];
  comments: Comment[];
  artifacts: Artifact[];
  activityLog: Event[];
  createdAt: number;
  updatedAt: number;
}

export interface Comment {
  id: number;
  taskId: number;
  author: string;
  text: string;
  createdAt: number;
}

export interface Artifact {
  id: number;
  taskId: number;
  type: string;
  title: string;
  contentText?: string;
  filePath?: string;
  url?: string;
  size?: string;
  createdBy: string;
  createdAt: number;
}

export interface Event<T = unknown> {
  id: number;
  taskId: number;
  type: EventType;
  payload: T;
  createdAt: number;
}

export interface WorkspaceConfig {
  repoPath: string;
  docsPath: string;
  ciPresetsPath: string;
}
