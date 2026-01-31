/**
 * Backlog List Component
 *
 * Displays unscheduled tasks in the backlog.
 * Supports expand/collapse, drag-drop to sprints, and bulk task selection.
 *
 * @example
 * <BacklogList
 *   tasks={unscheduledTasks}
 *   isExpanded={true}
 *   onToggle={handleToggle}
 *   onTaskClick={handleSelectTask}
 *   onTaskDelete={handleDeleteTask}
 *   onBulkMoveToSprint={handleBulkMove}
 *   sprints={availableSprints}
 * />
 */

"use client";

import { type Task, TaskStatus, type Sprint } from "@locusai/shared";
import { motion } from "framer-motion";
import { Inbox, Plus } from "lucide-react";
import { useState } from "react";
import { DraggableTask, DroppableSection } from "@/components/dnd";
import { TaskCard } from "@/components/TaskCard";
import { Button, EmptyState } from "@/components/ui";
import { BacklogSection } from "./BacklogSection";
import { BulkActionsBar } from "./BulkActionsBar";

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
  /** Called when bulk moving tasks to a sprint */
  onBulkMoveToSprint?: (taskIds: string[], sprintId: string) => Promise<void>;
  /** Available sprints for bulk move */
  sprints?: Sprint[];
  /** Called when creating a new task */
  onNewTask?: () => void;
}

export function BacklogList({
  tasks,
  isExpanded,
  onToggle,
  onTaskClick,
  onTaskDelete,
  onBulkMoveToSprint,
  sprints = [],
  onNewTask,
}: BacklogListProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleBulkMove = async (sprintId: string) => {
    if (onBulkMoveToSprint) {
      await onBulkMoveToSprint(Array.from(selectedTasks), sprintId);
      setSelectedTasks(new Set());
    }
  };

  const handleClearSelection = () => {
    setSelectedTasks(new Set());
  };

  return (
    <>
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
              <EmptyState
                variant="compact"
                icon={Inbox}
                title="No tasks in backlog"
                description="Create tasks to organize your work. Add them to sprints when you're ready to start."
                action={
                  onNewTask && (
                    <Button
                      size="sm"
                      onClick={onNewTask}
                      className="shadow-lg shadow-primary/20"
                    >
                      <Plus size={16} className="mr-2" />
                      Create Task (Alt+N)
                    </Button>
                  )
                }
              />
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
                        selected={selectedTasks.has(task.id)}
                        onSelect={() => toggleTaskSelection(task.id)}
                      />
                    </DraggableTask>
                  </motion.div>
                ))}
              </div>
            )}
          </DroppableSection>
        </BacklogSection>
      </motion.div>

      {selectedTasks.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedTasks.size}
          sprints={sprints}
          onMoveToSprint={handleBulkMove}
          onClearSelection={handleClearSelection}
        />
      )}
    </>
  );
}
