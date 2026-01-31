/**
 * Task Properties Component
 *
 * Displays and allows editing of task metadata like status, priority, assignee, etc.
 *
 * @example
 * <TaskProperties task={task} onUpdate={handleUpdate} />
 */

"use client";

import {
  AssigneeRole,
  type Task,
  TaskPriority,
  TaskStatus,
} from "@locusai/shared";
import { format } from "date-fns";
import { PropertyItem, SectionLabel } from "@/components";

interface TaskPropertiesProps {
  /** Task to display */
  task: Task;
  /** Whether a mutation is loading */
  isLoading?: boolean;
  /** Callback when task properties are updated */
  onUpdate: (updates: Partial<Task>) => void;
}

/**
 * Task Properties Component
 *
 * Features:
 * - Editable status dropdown
 * - Assignee role selection
 * - Priority level
 * - Due date picker
 * - Assignee field
 *
 * @component
 */
export function TaskProperties({
  task,
  isLoading = false,
  onUpdate,
}: TaskPropertiesProps) {
  const formatDate = (date: string | number | Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  return (
    <div className="mb-10">
      <SectionLabel as="h4" className="mb-6 pb-2 border-b border-border/40">
        Task Properties
      </SectionLabel>
      <div className="space-y-3">
        <PropertyItem
          label="Status"
          value={task.status}
          onEdit={(newValue: string) =>
            onUpdate({ status: newValue as TaskStatus })
          }
          options={Object.values(TaskStatus)}
          type="dropdown"
          disabled={isLoading}
          tooltip="Current state of the task in its lifecycle"
        />
        <PropertyItem
          label="Role"
          value={task.assigneeRole || "Unassigned"}
          onEdit={(newValue: string) =>
            onUpdate({
              assigneeRole: newValue as AssigneeRole,
            })
          }
          options={Object.values(AssigneeRole)}
          type="dropdown"
          disabled={isLoading}
          tooltip="Team member role responsible for this task"
        />
        <PropertyItem
          label="Priority"
          value={task.priority || TaskPriority.MEDIUM}
          onEdit={(newValue: string) =>
            onUpdate({ priority: newValue as TaskPriority })
          }
          options={Object.values(TaskPriority)}
          type="dropdown"
          disabled={isLoading}
          tooltip="Urgency level for task completion"
        />
        <PropertyItem
          label="Deadline"
          value={task.dueDate ? formatDate(task.dueDate) : "Undetermined"}
          onEdit={(newValue: string) =>
            onUpdate({ dueDate: newValue ? Number(newValue) : null })
          }
          type="date"
          disabled={isLoading}
          tooltip="Target completion date for the task"
        />
        <PropertyItem
          label="Assignee"
          value={task.assignedTo || "Available"}
          onEdit={(newValue: string) =>
            onUpdate({ assignedTo: newValue || null })
          }
          type="text"
          disabled={isLoading}
          placeholder="Enter assignee name or ID"
          tooltip="Team member responsible for implementing this task"
        />
      </div>
    </div>
  );
}
