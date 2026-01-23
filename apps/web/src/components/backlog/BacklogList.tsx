/**
 * Backlog List Component
 *
 * Displays unscheduled tasks in the backlog.
 * Supports expand/collapse and drag-drop to sprints.
 *
 * @example
 * <BacklogList
 *   tasks={unscheduledTasks}
 *   isExpanded={true}
 *   onToggle={handleToggle}
 *   onTaskClick={handleSelectTask}
 *   onTaskDelete={handleDeleteTask}
 * />
 */

"use client";

import { type Task, TaskStatus } from "@locusai/shared";
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";
import { DraggableTask, DroppableSection } from "@/components/dnd";
import { TaskCard } from "@/components/TaskCard";
import { BacklogSection } from "./BacklogSection";

interface BacklogListProps {
  /** Unscheduled tasks to display */
  tasks: Task[];
  /** Whether the backlog section is expanded */
  isExpanded: boolean;
  /** Called when expanding/collapsing */
  onToggle: () => void;
  /** Called when a task is selected */
  onTaskClick: (taskId: string) => void;
  /** Called when delete action is triggered */
  onTaskDelete: (taskId: string) => void;
}

export function BacklogList({
  tasks,
  isExpanded,
  onToggle,
  onTaskClick,
  onTaskDelete,
}: BacklogListProps) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: 0.05 }}
    >
      <BacklogSection
        id="backlog"
        title="Backlog"
        icon={<Inbox size={18} className="text-slate-400" />}
        count={tasks.length}
        isExpanded={isExpanded}
        onToggle={onToggle}
        accentColor="slate"
      >
        <DroppableSection id="backlog">
          {tasks.length === 0 ? (
            <div className="py-6 border border-dashed border-border/20 rounded-xl text-center text-muted-foreground/40 text-[11px] font-medium bg-secondary/5">
              No tasks in backlog
            </div>
          ) : (
            <div className="pt-1">
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
