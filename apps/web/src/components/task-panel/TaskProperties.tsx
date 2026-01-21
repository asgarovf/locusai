"use client";

import {
  AssigneeRole,
  type Task,
  TaskPriority,
  TaskStatus,
} from "@locusai/shared";
import { format } from "date-fns";
import { PropertyItem } from "@/components";

interface TaskPropertiesProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export function TaskProperties({ task, onUpdate }: TaskPropertiesProps) {
  const formatDate = (date: string | number | Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  return (
    <div className="mb-10">
      <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 mb-6 pb-2 border-b border-border/40">
        Mission Specs
      </h4>
      <div className="space-y-3">
        <PropertyItem
          label="State"
          value={task.status}
          onEdit={(newValue: string) =>
            onUpdate({ status: newValue as TaskStatus })
          }
          options={Object.values(TaskStatus)}
          type="dropdown"
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
        />
        <PropertyItem
          label="Priority"
          value={task.priority || TaskPriority.MEDIUM}
          onEdit={(newValue: string) =>
            onUpdate({ priority: newValue as TaskPriority })
          }
          options={Object.values(TaskPriority)}
          type="dropdown"
        />
        <PropertyItem
          label="Deadline"
          value={task.dueDate ? formatDate(task.dueDate) : "Undetermined"}
          onEdit={(newValue: string) =>
            onUpdate({ dueDate: newValue ? new Date(newValue) : null })
          }
          type="date"
        />
        <PropertyItem
          label="Operator"
          value={task.assignedTo || "Available"}
          onEdit={(newValue: string) =>
            onUpdate({ assignedTo: newValue || null })
          }
          type="text"
        />
      </div>
    </div>
  );
}
