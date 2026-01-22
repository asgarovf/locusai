/**
 * Task Card Component
 *
 * Displays a task in card or list format.
 * Shows title, status, priority, deadline, and actions.
 * Supports drag-drop and delete operations.
 *
 * Features:
 * - Card and list display variants
 * - Priority color coding
 * - Deadline display
 * - Delete action menu
 * - Click handler for selection
 * - Drag state styling
 *
 * @example
 * <TaskCard
 *   task={task}
 *   onClick={handleSelect}
 *   onDelete={handleDelete}
 *   isDragging={isDragging}
 *   variant="card"
 * />
 */

"use client";

import { type Task, TaskPriority } from "@locusai/shared";
import { Calendar, MoreHorizontal, Tag, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  /** Task to display */
  task: Task;
  /** Called when card is clicked */
  onClick?: () => void;
  /** Called when delete action is triggered */
  onDelete?: (id: string) => void;
  /** Whether task is being dragged */
  isDragging?: boolean;
  /** Display variant (card or list) */
  variant?: "card" | "list";
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: "#94a3b8",
  [TaskPriority.MEDIUM]: "#38bdf8",
  [TaskPriority.HIGH]: "#f59e0b",
  [TaskPriority.CRITICAL]: "#ef4444",
};

export function TaskCard({
  task,
  onClick,
  onDelete,
  isDragging,
  variant = "card",
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

  const priority = (task.priority as TaskPriority) || TaskPriority.MEDIUM;

  if (variant === "list") {
    return (
      <div
        className={cn(
          "group relative bg-card/40 border border-border/40 rounded-lg overflow-hidden transition-all hover:bg-secondary/20 hover:border-border cursor-pointer flex items-center h-10 px-3 gap-4",
          isDragging && "opacity-50 scale-[0.98] shadow-lg"
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 min-w-[70px]">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[priority] }}
          />
          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
            {priority.slice(0, 3)}
          </span>
        </div>

        <h4 className="text-[13px] font-medium text-foreground/90 truncate flex-1">
          {task.title}
        </h4>

        <div className="flex items-center gap-4 text-muted-foreground/50">
          {task.acceptanceChecklist?.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <span
                className={cn(
                  "h-1 w-1 rounded-full",
                  task.acceptanceChecklist.every((i) => i.done)
                    ? "bg-emerald-500"
                    : "bg-primary/40"
                )}
              />
              {task.acceptanceChecklist.filter((i) => i.done).length}/
              {task.acceptanceChecklist.length}
            </div>
          )}

          {task.assigneeRole && (
            <div className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold border border-primary/20">
              {task.assigneeRole}
            </div>
          )}

          <div className="flex items-center gap-1 text-[10px]">
            <Calendar size={10} />
            <span>
              {new Date(task.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {onDelete && (
          <div className="flex items-center ml-2" ref={menuRef}>
            <button
              className="p-1 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete task?")) onDelete(task.id);
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative bg-card border rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-muted-foreground/20 cursor-pointer",
        isDragging && "opacity-50 scale-95 rotate-1 shadow-lg"
      )}
      onClick={onClick}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div
              className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${PRIORITY_COLORS[priority]}20`,
                color: PRIORITY_COLORS[priority],
                border: `1px solid ${PRIORITY_COLORS[priority]}30`,
              }}
            >
              {priority}
            </div>
          </div>
          {task.assigneeRole && (
            <div className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold border border-primary/20">
              {task.assigneeRole}
            </div>
          )}
        </div>

        <h4 className="font-semibold leading-snug text-foreground mb-1.5 text-[14px]">
          {task.title}
        </h4>

        <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
              <Calendar size={10} />
              <span>
                {new Date(task.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {task.acceptanceChecklist?.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    task.acceptanceChecklist.every((i) => i.done)
                      ? "bg-emerald-500"
                      : "bg-primary/40"
                  )}
                />
                {task.acceptanceChecklist.filter((i) => i.done).length}/
                {task.acceptanceChecklist.length}
              </div>
            )}
          </div>

          {task.labels.length > 0 && (
            <div className="flex gap-1">
              {task.labels.slice(0, 1).map((l) => (
                <span
                  key={l}
                  className="text-[9px] font-medium text-muted-foreground/70 flex items-center gap-1"
                >
                  <Tag size={9} /> {l}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {onDelete && (
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
      )}
    </div>
  );
}
