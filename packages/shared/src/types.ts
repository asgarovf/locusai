// ============================================================================
// Multi-tenancy Enums
// ============================================================================

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

export enum MembershipRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

// ============================================================================
// Task & Sprint Enums
// ============================================================================

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

// ============================================================================
// Multi-tenancy Entities
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description?: string | null;
  repoUrl?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

export interface Membership {
  id: string;
  userId: string;
  orgId: string;
  role: MembershipRole;
  createdAt: number;
}

export interface APIKey {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  keyPrefix: string; // First 8 chars for display (e.g., "lk_abc123")
  keyHash: string; // Hashed full key for validation
  lastUsedAt?: number | null;
  expiresAt?: number | null;
  createdAt: number;
}

export interface Document {
  id: string;
  projectId: string;
  path: string; // Virtual path, e.g., "architecture/overview.md"
  title: string;
  content: string;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Core Entities (Updated with projectId)
// ============================================================================

export interface Sprint {
  id: number;
  projectId?: string | null; // Optional for backward compatibility (local mode)
  name: string;
  status: SprintStatus;
  startDate?: number;
  endDate?: number;
  createdAt: number;
}

export interface Task {
  id: number;
  projectId?: string | null; // Optional for backward compatibility (local mode)
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
