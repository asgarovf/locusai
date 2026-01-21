"use client";

import { type Sprint, type Task } from "@locusai/shared";
import { motion } from "framer-motion";
import { CheckCircle, Flag, Layers, Play } from "lucide-react";
import { DraggableTask, DroppableSection } from "@/components/dnd";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui";
import { BacklogSection } from "./BacklogSection";

interface SprintSectionProps {
  sprint: Sprint;
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  isActive?: boolean;
  onComplete?: (sprintId: string) => void;
  onStart?: (sprintId: string) => void;
  onTaskClick: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
  isSubmitting?: boolean;
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
              variant="subtle"
              onClick={() => onComplete?.(sprint.id)}
              disabled={isSubmitting}
              className="h-7 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500"
            >
              <CheckCircle size={14} className="mr-1" />
              Complete
            </Button>
          ) : (
            canStart && (
              <Button
                size="sm"
                onClick={() => onStart?.(sprint.id)}
                disabled={isSubmitting}
                className="h-7 bg-amber-500 text-black hover:bg-amber-600 border-none px-3 font-bold"
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
