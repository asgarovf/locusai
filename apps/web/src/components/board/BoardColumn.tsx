/**
 * Board Column Component
 *
 * Displays a single kanban column for a task status.
 * Supports drag-and-drop task movement between columns.
 *
 * @example
 * <BoardColumn
 *   statusKey="IN_PROGRESS"
 *   title="In Progress"
 *   tasks={tasksInProgress}
 *   onTaskClick={handleSelectTask}
 *   onTaskDelete={handleDeleteTask}
 * />
 */

"use client";

import { type Task } from "@locusai/shared";
import { DraggableTask, DroppableSection } from "@/components/dnd";
import { TaskCard } from "@/components/TaskCard";
import { cn } from "@/lib/utils";
import { BOARD_STATUSES } from "./constants";

interface BoardColumnProps {
  /** Unique key identifying the status */
  statusKey: string;
  /** Display title for the column */
  title: string;
  /** Tasks to display in this column */
  tasks: Task[];
  /** Called when a task card is clicked */
  onTaskClick: (taskId: string) => void;
  /** Called when delete action is triggered */
  onTaskDelete: (taskId: string) => void;
  /** Whether to display in compact mode */
  isCompact?: boolean;
}

/**
 * Board Column Component
 *
 * Features:
 * - Displays tasks in a kanban column
 * - Drag-drop enabled via DroppableSection
 * - Shows task count
 * - Empty state message
 * - Color-coded by status
 *
 * @component
 */
export function BoardColumn({
  statusKey,
  title,
  tasks,
  onTaskClick,
  onTaskDelete,
  isCompact = false,
}: BoardColumnProps) {
  const statusConfig = BOARD_STATUSES.find((s) => s.key === statusKey);
  const colorClass = statusConfig?.className || "bg-slate-500";

  return (
    <div
      className={cn(
        "flex flex-col shrink-0 h-full",
        isCompact ? "w-96" : "w-80"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn("w-2 h-2 rounded-full", colorClass)} />
        <span className="text-sm font-semibold text-foreground tracking-tight">
          {title}
        </span>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Column Content */}
      <DroppableSection id={statusKey} className="flex-1 min-h-0">
        <div className="flex-1 h-full rounded-xl bg-secondary/10 border border-border/40 p-2 min-h-[calc(100vh-220px)] backdrop-blur-sm transition-colors hover:bg-secondary/20 overflow-y-auto custom-scrollbar">
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground/60 gap-2 opacity-0 hover:opacity-100 transition-opacity">
              <span>Drop tasks here</span>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {tasks.map((task) => (
                <DraggableTask key={task.id} task={task}>
                  <TaskCard
                    task={task}
                    onClick={() => onTaskClick(task.id)}
                    onDelete={onTaskDelete}
                    variant={isCompact ? "list" : "card"}
                  />
                </DraggableTask>
              ))}
            </div>
          )}
        </div>
      </DroppableSection>
    </div>
  );
}
