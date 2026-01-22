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

import { type Sprint, type Task } from "@locusai/shared";
import { motion } from "framer-motion";
import { CheckCircle, Flag, Layers, Play } from "lucide-react";
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
          isActive ? (
            <Button
              size="sm"
              variant="emerald-subtle"
              onClick={() => onComplete?.(sprint.id)}
              isLoading={isSubmitting}
            >
              <CheckCircle size={14} className="mr-1" />
              Complete
            </Button>
          ) : (
            canStart && (
              <Button
                size="sm"
                variant="amber"
                onClick={() => onStart?.(sprint.id)}
                isLoading={isSubmitting}
              >
                <Play size={12} className="mr-1.5 fill-current" />
                Start
              </Button>
            )
          )
        }
      >
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
            <div className="space-y-1.5 pt-1">
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
                      variant="list"
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
