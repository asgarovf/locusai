import { AssigneeRole, TaskPriority, TaskStatus } from "@locusai/shared";
import { capitalize } from "./utils";

export interface OptionItem<T extends string = string> {
  value: T;
  label: string;
  color?: string;
}

/**
 * Status color mapping for UI consistency.
 */
const STATUS_COLOR_MAP: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: "#64748b",
  [TaskStatus.IN_PROGRESS]: "#f59e0b",
  [TaskStatus.REVIEW]: "#a855f7",
  [TaskStatus.VERIFICATION]: "#38bdf8",
  [TaskStatus.DONE]: "#10b981",
  [TaskStatus.BLOCKED]: "#ef4444",
};

/**
 * Priority color mapping for UI consistency.
 */
const PRIORITY_COLOR_MAP: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: "#64748b",
  [TaskPriority.MEDIUM]: "#38bdf8",
  [TaskPriority.HIGH]: "#f59e0b",
  [TaskPriority.CRITICAL]: "#ef4444",
};

/**
 * Get all available task status options.
 */
export function getStatusOptions(): OptionItem<TaskStatus>[] {
  return Object.values(TaskStatus).map((status) => ({
    value: status,
    label: status.replace(/_/g, " "),
    color: STATUS_COLOR_MAP[status],
  }));
}

/**
 * Get status color for a specific status value.
 */
export function getStatusColor(status: TaskStatus): string {
  return STATUS_COLOR_MAP[status];
}

/**
 * Get all available priority options.
 */
export function getPriorityOptions(): OptionItem<TaskPriority>[] {
  return [
    {
      value: TaskPriority.LOW,
      label: "Low",
      color: PRIORITY_COLOR_MAP[TaskPriority.LOW],
    },
    {
      value: TaskPriority.MEDIUM,
      label: "Medium",
      color: PRIORITY_COLOR_MAP[TaskPriority.MEDIUM],
    },
    {
      value: TaskPriority.HIGH,
      label: "High",
      color: PRIORITY_COLOR_MAP[TaskPriority.HIGH],
    },
    {
      value: TaskPriority.CRITICAL,
      label: "Critical",
      color: PRIORITY_COLOR_MAP[TaskPriority.CRITICAL],
    },
  ];
}

/**
 * Get all available assignee role options.
 */
export function getAssigneeOptions(): OptionItem<AssigneeRole>[] {
  return Object.values(AssigneeRole).map((role) => ({
    value: role,
    label: capitalize(role),
  }));
}

/**
 * Get all available membership role options.
 */
export function getMembershipRoleOptions(): OptionItem[] {
  return [
    { value: "MEMBER", label: "Member" },
    { value: "ADMIN", label: "Admin" },
  ];
}
