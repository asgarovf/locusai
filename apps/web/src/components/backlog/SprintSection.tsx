/**
 * Sprint Section Component
 *
 * Displays a sprint with its tasks in the backlog view.
 * Supports start/complete actions and drag-drop task management.
 *
 * @example
 * <SprintSection
 *   sprint={sprint}
 *   tasks={sprintTasks}
 *   isExpanded={true}
 *   onToggle={handleToggle}
 *   isActive={true}
 *   onStart={handleStart}
 *   onComplete={handleComplete}
 *   onTaskClick={handleSelectTask}
 *   onTaskDelete={handleDeleteTask}
 * />
 */

"use client";

import { type Sprint, type Task, TaskStatus } from "@locusai/shared";
import { motion } from "framer-motion";
import { CheckCircle, Flag, Layers, Play, Trash2 } from "lucide-react";
import { DraggableTask, DroppableSection } from "@/components/dnd";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui";
import { BacklogSection } from "./BacklogSection";

interface SprintSectionProps {
  /** Sprint data */
  sprint: Sprint;
  /** Tasks in this sprint */
  tasks: Task[];
  /** Whether section is expanded */
  isExpanded: boolean;
  /** Called when toggling expand state */
  onToggle: () => void;
  /** Whether this is the active sprint */
  isActive?: boolean;
  /** Called when completing sprint */
  onComplete?: (sprintId: string) => void;
  /** Called when starting sprint */
  onStart?: (sprintId: string) => void;
  /** Called when delete action is triggered for sprint */
  onDelete?: (sprintId: string) => void;
  /** Called when task is selected */
  onTaskClick: (taskId: string) => void;
  /** Called when delete action is triggered */
  onTaskDelete: (taskId: string) => void;
  /** Whether an action is in progress */
  isSubmitting?: boolean;
  /** Whether sprint can be started */
  canStart?: boolean;
}

export function SprintSection({
  sprint,
  tasks,
  isExpanded,
  onToggle,
  isActive,
  onComplete,
  onStart,
  onDelete,
  onTaskClick,
  onTaskDelete,
  isSubmitting,
  canStart,
}: SprintSectionProps) {
  const accentColor = isActive ? "emerald" : "amber";
  const icon = isActive ? (
    <Flag size={18} className="text-emerald-500" />
  ) : (
    <Layers size={18} className="text-amber-500/80" />
  );

  const getSprintProgress = (sprintTasks: Task[]) => {
    const total = sprintTasks.length;
    const byStatus = {
      backlog: sprintTasks.filter((t) => t.status === TaskStatus.BACKLOG)
        .length,
      inProgress: sprintTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS)
        .length,
      inReview: sprintTasks.filter(
        (t) => t.status === TaskStatus.IN_REVIEW
      ).length,
      done: sprintTasks.filter((t) => t.status === TaskStatus.DONE).length,
    };
    const completionPercentage = total > 0 ? (byStatus.done / total) * 100 : 0;

    return { total, byStatus, completionPercentage };
  };

  const progress = getSprintProgress(tasks);

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <BacklogSection
        id={`sprint-${sprint.id}`}
        title={sprint.name}
        icon={icon}
        count={tasks.length}
        isExpanded={isExpanded}
        onToggle={onToggle}
        accentColor={accentColor}
        badge={isActive ? "Active" : "Planned"}
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isActive ? (
              <Button
                size="sm"
                variant="emerald-subtle"
                onClick={() => onComplete?.(sprint.id)}
                isLoading={isSubmitting}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <CheckCircle size={14} className="sm:mr-1" />
                <span className="hidden sm:inline">Complete</span>
              </Button>
            ) : (
              canStart && (
                <Button
                  size="sm"
                  variant="amber"
                  onClick={() => onStart?.(sprint.id)}
                  isLoading={isSubmitting}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Play size={12} className="sm:mr-1.5 fill-current" />
                  <span className="hidden sm:inline">Start</span>
                </Button>
              )
            )}
            {onDelete && tasks.length === 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(sprint.id)}
                disabled={isSubmitting}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        }
      >
        {tasks.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isActive ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${progress.completionPercentage}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <span className="whitespace-nowrap">
                Backlog: {progress.byStatus.backlog}
              </span>
              <span className="whitespace-nowrap">
                In Progress: {progress.byStatus.inProgress}
              </span>
              <span className="whitespace-nowrap">
                In Review: {progress.byStatus.inReview}
              </span>
              <span className="whitespace-nowrap">
                Done: {progress.byStatus.done}
              </span>
            </div>
          </div>
        )}
        <DroppableSection id={`sprint-${sprint.id}`}>
          {tasks.length === 0 ? (
            <div
              className={`py-8 border-2 border-dashed rounded-xl text-center text-[11px] font-medium ${
                isActive
                  ? "border-emerald-500/10 text-emerald-500/50 bg-emerald-500/5"
                  : "border-amber-500/10 text-amber-500/50 bg-amber-500/5"
              }`}
            >
              Drag tasks here to add to this sprint
            </div>
          ) : (
            <div className="pt-1 space-y-3">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <DraggableTask task={task}>
                    <TaskCard
                      task={task}
                      variant={
                        task.status === TaskStatus.DONE ? "list" : "card"
                      }
                      onClick={() => onTaskClick(task.id)}
                      onDelete={onTaskDelete}
                    />
                  </DraggableTask>
                </motion.div>
              ))}
            </div>
          )}
        </DroppableSection>
      </BacklogSection>
    </motion.div>
  );
}
