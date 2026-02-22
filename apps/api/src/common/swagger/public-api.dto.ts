import {
  AssigneeRole,
  JobStatus,
  JobType,
  MembershipRole,
  SprintStatus,
  SuggestionStatus,
  SuggestionType,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "@locusai/shared";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}

export class ApiKeyNameRequestDto {
  @ApiProperty({ example: "CI Worker Key", maxLength: 100 })
  name: string;
}

export class ApiKeyDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  organizationId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  workspaceId?: string | null;

  @ApiProperty({ example: "Default API Key" })
  name: string;

  @ApiProperty({ example: "lk_abcd..." })
  key: string;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: "ISO timestamp for the most recent key usage",
  })
  lastUsedAt?: string | null;

  @ApiProperty({ description: "ISO timestamp when the key was created" })
  createdAt: string;

  @ApiProperty({ description: "ISO timestamp when the key was last updated" })
  updatedAt: string;
}

export class ApiKeysResponseDto {
  @ApiProperty({ type: [ApiKeyDto] })
  apiKeys: ApiKeyDto[];
}

export class ApiKeyCreateResponseDto {
  @ApiProperty({ type: ApiKeyDto })
  apiKey: ApiKeyDto;
}

export class AuthUserDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ format: "email" })
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl?: string | null;

  @ApiProperty()
  onboardingCompleted: boolean;

  @ApiProperty()
  emailVerified: boolean;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiPropertyOptional()
  teamSize?: string;

  @ApiPropertyOptional()
  userRole?: string;

  @ApiPropertyOptional({ format: "uuid" })
  workspaceId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  orgId?: string;

  @ApiProperty({
    type: Number,
    description: "Unix timestamp in milliseconds",
  })
  createdAt: number;

  @ApiProperty({
    type: Number,
    description: "Unix timestamp in milliseconds",
  })
  updatedAt: number;
}

export class LoginResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class AuthApiKeyInfoDto {
  @ApiProperty({ example: "api_key" })
  authType: "api_key";

  @ApiPropertyOptional({ format: "uuid" })
  workspaceId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  orgId?: string;

  @ApiProperty()
  apiKeyName: string;
}

export class OtpRequestDto {
  @ApiProperty({ format: "email" })
  email: string;
}

export class VerifyOtpRequestDto {
  @ApiProperty({ format: "email" })
  email: string;

  @ApiProperty({ minLength: 6, maxLength: 6 })
  otp: string;
}

export class CompleteRegistrationRequestDto {
  @ApiProperty({ format: "email" })
  email: string;

  @ApiProperty({ minLength: 6, maxLength: 6 })
  otp: string;

  @ApiProperty({ maxLength: 100 })
  name: string;

  @ApiPropertyOptional({ maxLength: 100 })
  companyName?: string;

  @ApiPropertyOptional({ enum: ["solo", "2-10", "11-50", "51-200", "200+"] })
  teamSize?: string;

  @ApiPropertyOptional({
    enum: ["developer", "designer", "product_manager", "other"],
  })
  userRole?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  workspaceName?: string;

  @ApiPropertyOptional({ type: [String], format: "email" })
  invitedEmails?: string[];
}

export class ChecklistItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  text: string;

  @ApiProperty()
  done: boolean;
}

export class WorkspaceDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ format: "uuid" })
  orgId: string;

  @ApiProperty({ maxLength: 100 })
  name: string;

  @ApiPropertyOptional({
    type: [ChecklistItemDto],
    nullable: true,
  })
  defaultChecklist?: ChecklistItemDto[] | null;

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;

  @ApiProperty({ description: "ISO timestamp" })
  updatedAt: string;
}

export class WorkspaceResponseDto {
  @ApiProperty({ type: WorkspaceDto })
  workspace: WorkspaceDto;
}

export class WorkspacesResponseDto {
  @ApiProperty({ type: [WorkspaceDto] })
  workspaces: WorkspaceDto[];
}

export class CreateWorkspaceRequestDto {
  @ApiProperty({ maxLength: 100 })
  name: string;
}

export class UpdateWorkspaceRequestDto {
  @ApiPropertyOptional({ maxLength: 100 })
  name?: string;

  @ApiPropertyOptional({ type: [ChecklistItemDto] })
  defaultChecklist?: ChecklistItemDto[];
}

export class WorkspaceStatsDto {
  @ApiProperty()
  workspaceName: string;

  @ApiProperty({
    type: "object",
    additionalProperties: { type: "number" },
  })
  taskCounts: Record<string, number>;

  @ApiProperty()
  memberCount: number;
}

export class ActivityEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ format: "uuid" })
  workspaceId: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  taskId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  userId?: string | null;

  @ApiProperty()
  type: string;

  @ApiProperty({ type: "object", additionalProperties: true })
  payload: Record<string, unknown>;

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;
}

export class WorkspaceActivityResponseDto {
  @ApiProperty({ type: [ActivityEventDto] })
  activity: ActivityEventDto[];
}

export class DispatchTaskRequestDto {
  @ApiPropertyOptional()
  workerId?: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  sprintId?: string | null;
}

export class AgentHeartbeatRequestDto {
  @ApiProperty()
  agentId: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  currentTaskId?: string | null;

  @ApiPropertyOptional({ enum: ["IDLE", "WORKING", "COMPLETED", "FAILED"] })
  status?: string;
}

export class AgentRegistrationDto {
  @ApiProperty()
  agentId: string;

  @ApiProperty({ format: "uuid" })
  workspaceId: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  currentTaskId?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty({ description: "ISO timestamp" })
  lastHeartbeat: string;

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;
}

export class AgentHeartbeatResponseDto {
  @ApiProperty({ type: AgentRegistrationDto })
  agent: AgentRegistrationDto;
}

export class AgentsListResponseDto {
  @ApiProperty({ type: [AgentRegistrationDto] })
  agents: AgentRegistrationDto[];
}

export class OrganizationDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ maxLength: 100 })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl?: string | null;

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;

  @ApiProperty({ description: "ISO timestamp" })
  updatedAt: string;
}

export class OrganizationsResponseDto {
  @ApiProperty({ type: [OrganizationDto] })
  organizations: OrganizationDto[];
}

export class OrganizationResponseDto {
  @ApiProperty({ type: OrganizationDto })
  organization: OrganizationDto;
}

export class AddMemberRequestDto {
  @ApiProperty({ format: "uuid" })
  userId: string;

  @ApiProperty({ enum: ["ADMIN", "MEMBER"], default: "MEMBER" })
  role: "ADMIN" | "MEMBER";
}

export class MembershipUserDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ format: "email" })
  email: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl?: string | null;
}

export class MembershipDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ format: "uuid" })
  userId: string;

  @ApiProperty({ format: "uuid" })
  orgId: string;

  @ApiProperty({ enum: MembershipRole })
  role: MembershipRole;

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;

  @ApiPropertyOptional({ type: MembershipUserDto })
  user?: MembershipUserDto;
}

export class MembersResponseDto {
  @ApiProperty({ type: [MembershipDto] })
  members: MembershipDto[];
}

export class MembershipResponseDto {
  @ApiProperty({ type: MembershipDto })
  membership: MembershipDto;
}

export class AcceptanceItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  text: string;

  @ApiProperty()
  done: boolean;
}

export class TaskDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ format: "uuid" })
  workspaceId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  description: string;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  priority: TaskPriority;

  @ApiProperty({ type: [String] })
  labels: string[];

  @ApiPropertyOptional({ enum: AssigneeRole, nullable: true })
  assigneeRole?: AssigneeRole | null;

  @ApiPropertyOptional({ nullable: true })
  assignedTo?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  sprintId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  parentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  dueDate?: string | number | null;

  @ApiPropertyOptional({ nullable: true })
  prUrl?: string | null;

  @ApiProperty({ type: [AcceptanceItemDto] })
  acceptanceChecklist: AcceptanceItemDto[];

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;

  @ApiProperty({ description: "ISO timestamp" })
  updatedAt: string;

  @ApiPropertyOptional()
  order?: number;
}

export class TaskResponseDto {
  @ApiProperty({ type: TaskDto })
  task: TaskDto;
}

export class TasksResponseDto {
  @ApiProperty({ type: [TaskDto] })
  tasks: TaskDto[];
}

export class CreateTaskRequestDto {
  @ApiProperty({ maxLength: 200 })
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.BACKLOG })
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority?: TaskPriority;

  @ApiPropertyOptional({ type: [String] })
  labels?: string[];

  @ApiPropertyOptional({ enum: AssigneeRole })
  assigneeRole?: AssigneeRole;

  @ApiPropertyOptional({ nullable: true })
  assignedTo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  dueDate?: string | number | null;

  @ApiPropertyOptional({ nullable: true })
  parentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  sprintId?: string | null;

  @ApiPropertyOptional({ type: [AcceptanceItemDto] })
  acceptanceChecklist?: AcceptanceItemDto[];

  @ApiPropertyOptional({ type: [String] })
  docIds?: string[];

  @ApiPropertyOptional()
  order?: number;
}

export class UpdateTaskRequestDto {
  @ApiPropertyOptional({ maxLength: 200 })
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  priority?: TaskPriority;

  @ApiPropertyOptional({ type: [String] })
  labels?: string[];

  @ApiPropertyOptional({ enum: AssigneeRole, nullable: true })
  assigneeRole?: AssigneeRole | null;

  @ApiPropertyOptional({ nullable: true })
  assignedTo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  dueDate?: string | number | null;

  @ApiPropertyOptional({ nullable: true })
  parentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  sprintId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  prUrl?: string | null;

  @ApiPropertyOptional({ type: [AcceptanceItemDto] })
  acceptanceChecklist?: AcceptanceItemDto[];

  @ApiPropertyOptional({ type: [String] })
  docIds?: string[];

  @ApiPropertyOptional()
  order?: number;
}

export class BatchUpdateTasksRequestDto {
  @ApiProperty({ type: [String] })
  ids: string[];

  @ApiProperty({ type: UpdateTaskRequestDto })
  updates: UpdateTaskRequestDto;
}

export class AddCommentRequestDto {
  @ApiProperty()
  author: string;

  @ApiProperty()
  text: string;
}

export class CommentDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ format: "uuid" })
  taskId: string;

  @ApiProperty()
  author: string;

  @ApiProperty()
  text: string;

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;

  @ApiProperty({ description: "ISO timestamp" })
  updatedAt: string;
}

export class CommentResponseDto {
  @ApiProperty({ type: CommentDto })
  comment: CommentDto;
}

export class SprintDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ format: "uuid" })
  workspaceId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: SprintStatus })
  status: SprintStatus;

  @ApiPropertyOptional({ nullable: true, description: "ISO timestamp" })
  startDate?: string | null;

  @ApiPropertyOptional({ nullable: true, description: "ISO timestamp" })
  endDate?: string | null;

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;
}

export class SprintResponseDto {
  @ApiProperty({ type: SprintDto })
  sprint: SprintDto;
}

export class SprintsResponseDto {
  @ApiProperty({ type: [SprintDto] })
  sprints: SprintDto[];
}

export class CreateSprintRequestDto {
  @ApiProperty({ maxLength: 100 })
  name: string;

  @ApiPropertyOptional()
  startDate?: string | number;

  @ApiPropertyOptional()
  endDate?: string | number;

  @ApiPropertyOptional({ type: [String] })
  taskIds?: string[];
}

export class UpdateSprintRequestDto {
  @ApiPropertyOptional({ maxLength: 100 })
  name?: string;

  @ApiPropertyOptional({ enum: SprintStatus })
  status?: SprintStatus;

  @ApiPropertyOptional({ nullable: true })
  startDate?: string | number | null;

  @ApiPropertyOptional({ nullable: true })
  endDate?: string | number | null;
}

export class InvitationDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ format: "uuid" })
  orgId: string;

  @ApiProperty({ format: "email" })
  email: string;

  @ApiProperty({ enum: MembershipRole })
  role: MembershipRole;

  @ApiProperty()
  token: string;

  @ApiProperty({ description: "Unix timestamp in milliseconds" })
  expiresAt: number;

  @ApiPropertyOptional({
    nullable: true,
    description: "Unix timestamp in milliseconds",
  })
  acceptedAt?: number | null;

  @ApiProperty({ format: "uuid" })
  invitedBy: string;

  @ApiProperty({ description: "Unix timestamp in milliseconds" })
  createdAt: number;

  @ApiProperty({ description: "Unix timestamp in milliseconds" })
  updatedAt: number;
}

export class InvitationResponseDto {
  @ApiProperty({ type: InvitationDto })
  invitation: InvitationDto;

  @ApiPropertyOptional()
  userExists?: boolean;
}

export class InvitationsResponseDto {
  @ApiProperty({ type: [InvitationDto] })
  invitations: InvitationDto[];
}

export class CreateInvitationRequestDto {
  @ApiProperty({ format: "email" })
  email: string;

  @ApiProperty({ enum: MembershipRole })
  role: MembershipRole;
}

export class AcceptInvitationRequestDto {
  @ApiProperty()
  token: string;

  @ApiPropertyOptional()
  name?: string;
}

export class AcceptedMembershipDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ format: "uuid" })
  userId: string;

  @ApiProperty({ format: "uuid" })
  orgId: string;

  @ApiProperty({ enum: MembershipRole })
  role: MembershipRole;

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;
}

export class AcceptInvitationResponseDto {
  @ApiProperty({ type: AcceptedMembershipDto })
  membership: AcceptedMembershipDto;
}

// ============================================================================
// Job Runs
// ============================================================================

export class JobRunResultDto {
  @ApiProperty()
  summary: string;

  @ApiProperty()
  filesChanged: number;

  @ApiPropertyOptional()
  prUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  errors?: string[];
}

export class JobRunDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ enum: JobType })
  jobType: JobType;

  @ApiProperty({ enum: JobStatus })
  status: JobStatus;

  @ApiProperty({ format: "uuid" })
  workspaceId: string;

  @ApiPropertyOptional({ type: JobRunResultDto, nullable: true })
  result?: JobRunResultDto | null;

  @ApiPropertyOptional({ nullable: true })
  error?: string | null;

  @ApiProperty({ description: "ISO timestamp" })
  startedAt: string;

  @ApiPropertyOptional({ nullable: true, description: "ISO timestamp" })
  completedAt?: string | null;

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;

  @ApiProperty({ description: "ISO timestamp" })
  updatedAt: string;
}

export class JobRunResponseDto {
  @ApiProperty({ type: JobRunDto })
  jobRun: JobRunDto;
}

export class JobRunsResponseDto {
  @ApiProperty({ type: [JobRunDto] })
  jobRuns: JobRunDto[];
}

export class CreateJobRunRequestDto {
  @ApiProperty({ enum: JobType })
  jobType: JobType;

  @ApiPropertyOptional({ enum: JobStatus, default: JobStatus.RUNNING })
  status?: JobStatus;

  @ApiPropertyOptional({ description: "ISO timestamp" })
  startedAt?: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional({ type: JobRunResultDto })
  result?: JobRunResultDto;
}

export class UpdateJobRunRequestDto {
  @ApiPropertyOptional({ enum: JobStatus })
  status?: JobStatus;

  @ApiPropertyOptional({ type: JobRunResultDto })
  result?: JobRunResultDto;

  @ApiPropertyOptional({ nullable: true })
  error?: string | null;

  @ApiPropertyOptional({ description: "ISO timestamp" })
  completedAt?: string;
}

// ============================================================================
// Suggestions
// ============================================================================

export class SuggestionDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ enum: SuggestionType })
  type: SuggestionType;

  @ApiProperty({ enum: SuggestionStatus })
  status: SuggestionStatus;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  jobRunId?: string | null;

  @ApiProperty({ format: "uuid" })
  workspaceId: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ description: "ISO timestamp" })
  expiresAt: string;

  @ApiProperty({ description: "ISO timestamp" })
  createdAt: string;

  @ApiProperty({ description: "ISO timestamp" })
  updatedAt: string;
}

export class SuggestionResponseDto {
  @ApiProperty({ type: SuggestionDto })
  suggestion: SuggestionDto;
}

export class SuggestionsResponseDto {
  @ApiProperty({ type: [SuggestionDto] })
  suggestions: SuggestionDto[];
}

export class CreateSuggestionRequestDto {
  @ApiProperty({ enum: SuggestionType })
  type: SuggestionType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ format: "uuid" })
  jobRunId?: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "ISO timestamp" })
  expiresAt?: string;
}

export class UpdateSuggestionStatusRequestDto {
  @ApiProperty({ enum: SuggestionStatus })
  status: SuggestionStatus;
}
