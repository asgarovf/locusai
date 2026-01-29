"use client";

import { Task, TaskPriority } from "@locusai/shared";
import { TaskCard } from "@/components/TaskCard";
import { BOARD_STATUSES } from "./constants";

interface MatrixViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
}

const PRIORITIES = [
  TaskPriority.CRITICAL,
  TaskPriority.HIGH,
  TaskPriority.MEDIUM,
  TaskPriority.LOW,
];

export function MatrixView({
  tasks,
  onTaskClick,
  onTaskDelete,
}: MatrixViewProps) {
  // Helper to get color for priority
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.CRITICAL:
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case TaskPriority.HIGH:
        return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case TaskPriority.MEDIUM:
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case TaskPriority.LOW:
        return "text-slate-500 bg-slate-500/10 border-slate-500/20";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6 min-h-0 bg-secondary/5">
      <div className="min-w-[1000px] h-full flex flex-col">
        {/* Header Row (Statuses) */}
        <div className="flex mb-4">
          <div className="w-24 shrink-0" /> {/* Empty corner */}
          {BOARD_STATUSES.map((status) => (
            <div
              key={status.key}
              className="flex-1 px-2 font-semibold text-sm text-foreground/70 text-center uppercase tracking-wider"
            >
              {status.label}
            </div>
          ))}
        </div>

        {/* Matrix Grid */}
        <div className="grid gap-4 flex-1">
          {PRIORITIES.map((priority) => (
            <div key={priority} className="flex gap-4 min-h-[180px]">
              {/* Row Header (Priority) */}
              <div
                className={`w-24 shrink-0 flex items-center justify-center font-bold text-xs rounded-lg border uppercase tracking-wider ${getPriorityColor(priority)}`}
              >
                {priority}
              </div>

              {/* Status Columns for this Priority */}
              {BOARD_STATUSES.map((status) => {
                const cellTasks = tasks.filter(
                  (t) => t.status === status.key && t.priority === priority
                );

                return (
                  <div
                    key={`${priority}-${status.key}`}
                    className="flex-1 bg-background/50 border border-border/40 rounded-xl p-3 hover:bg-background/80 transition-colors overflow-y-auto"
                  >
                    <div className="space-y-3">
                      {cellTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          variant="list"
                          onClick={() => onTaskClick(task.id)}
                          onDelete={onTaskDelete}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
