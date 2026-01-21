"use client";

import { type Task } from "@locusai/shared";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { TaskCard } from "@/components/TaskCard";

interface CompletedSprintItemProps {
  name: string;
  taskCount: number;
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  onTaskClick: (taskId: string) => void;
}

export function CompletedSprintItem({
  name,
  taskCount,
  tasks,
  isExpanded,
  onToggle,
  onTaskClick,
}: CompletedSprintItemProps) {
  return (
    <div className="rounded-lg border border-border/40 overflow-hidden bg-card/20 group transition-colors hover:border-border/60">
      <div
        onClick={onToggle}
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-card/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={15} className="text-green-500/60" />
            <span className="font-medium text-sm text-foreground/80">
              {name}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground/60 bg-secondary/30 px-3 py-0.5 rounded-full border border-border/20">
          {taskCount} tasks
        </span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-3 pb-3 space-y-1">
              {tasks.length === 0 ? (
                <div className="py-4 text-center text-[10px] text-muted-foreground/40 italic">
                  No tasks in this sprint
                </div>
              ) : (
                <div className="space-y-1">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      variant="list"
                      onClick={() => onTaskClick(task.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
