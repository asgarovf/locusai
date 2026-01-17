"use client";

import { type Task, TaskPriority } from "@locus/shared";
import { Calendar, Lock, MoreHorizontal, Tag, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDelete: (id: number) => void;
  isDragging?: boolean;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: "var(--text-muted)",
  [TaskPriority.MEDIUM]: "#38bdf8",
  [TaskPriority.HIGH]: "#f59e0b",
  [TaskPriority.CRITICAL]: "#ef4444",
};

export function TaskCard({
  task,
  onClick,
  onDelete,
  isDragging,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLocked =
    task.lockedBy && (!task.lockExpiresAt || task.lockExpiresAt > Date.now());
  const priority = (task.priority as TaskPriority) || TaskPriority.MEDIUM;

  return (
    <div
      className={cn(
        "group relative bg-card border rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-muted-foreground/20 cursor-pointer",
        isDragging && "opacity-50 scale-95 rotate-1 shadow-lg"
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", String(task.id));
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="p-4" onClick={onClick}>
        <div className="flex items-start gap-2 mb-3">
          <div className="flex flex-col items-center gap-1.5 pt-1">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: PRIORITY_COLORS[priority] }}
              title={`Priority: ${priority}`}
            />
            {isLocked && (
              <span title={`Locked by ${task.lockedBy}`}>
                <Lock size={12} className="text-muted-foreground" />
              </span>
            )}
          </div>
          <h4 className="text-[14px] font-semibold leading-tight text-foreground flex-1">
            {task.title}
          </h4>
        </div>

        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {task.labels.slice(0, 3).map((l) => (
              <span
                key={l}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-secondary text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                <Tag size={10} /> {l}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="px-1.5 py-0.5 rounded-sm bg-secondary text-[10px] font-bold text-muted-foreground">
                +{task.labels.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t mt-auto">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Calendar size={12} />
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
          {task.assigneeRole && (
            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center border shadow-sm">
              {task.assigneeRole.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-2 right-2" ref={menuRef}>
        <button
          className="p-1 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary hover:text-foreground transition-all"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <MoreHorizontal size={14} />
        </button>

        {showMenu && (
          <div className="absolute top-full right-0 mt-1 w-32 bg-popover border rounded-md p-1 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-200">
            <button
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-medium text-destructive rounded-sm hover:bg-destructive/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this task?")) {
                  onDelete(task.id);
                }
                setShowMenu(false);
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
