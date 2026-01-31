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
  /** Whether task is selected for bulk operations */
  selected?: boolean;
  /** Called when task selection is toggled */
  onSelect?: () => void;
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
  selected = false,
  onSelect,
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
          "group relative glass border-b-0 last:border-b border-border/10 rounded-none first:rounded-t-xl last:rounded-b-xl overflow-hidden transition-all duration-200 cursor-pointer flex items-center h-12 px-3 gap-2.5 hover:bg-secondary/30",
          isDragging && "opacity-50 scale-[0.98] shadow-lg rounded-xl border",
          selected && "bg-primary/10 border-primary/30 hover:bg-primary/15"
        )}
        onClick={onClick}
      >
        {/* Priority Indicator Line */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] opacity-80 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: PRIORITY_COLORS[priority] }}
        />

        {/* Selection Checkbox */}
        {onSelect && (
          <div
            className="flex items-center justify-center w-4 h-4 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <div
              className={cn(
                "w-4 h-4 rounded border-2 transition-all cursor-pointer flex items-center justify-center",
                selected
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30 hover:border-primary/50"
              )}
            >
              {selected && (
                <svg
                  viewBox="0 0 12 12"
                  className="w-2.5 h-2.5 text-primary-foreground stroke-current"
                  fill="none"
                  strokeWidth={2.5}
                >
                  <title>Selected</title>
                  <path d="M2 6 L5 9 L10 3" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Priority Badge */}
        <div className="flex items-center justify-center w-5 shrink-0">
          <div
            className="w-2 h-2 rounded-full shadow-sm ring-2 ring-background group-hover:ring-transparent transition-all"
            style={{
              backgroundColor: PRIORITY_COLORS[priority],
              boxShadow: `0 0 8px ${PRIORITY_COLORS[priority]}50`,
            }}
          />
        </div>

        {/* Title - More space for text */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-medium text-foreground/90 truncate tracking-tight group-hover:text-foreground transition-colors">
            {task.title}
          </h4>
        </div>

        {/* Labels - Compact display */}
        {task.labels && task.labels.length > 0 && (
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {task.labels.slice(0, 2).map((label, i) => (
              <span
                key={i}
                className="text-[9px] bg-secondary/70 text-secondary-foreground/70 px-1.5 py-0.5 rounded-[3px] border border-border/20"
              >
                {label}
              </span>
            ))}
            {task.labels.length > 2 && (
              <span className="text-[9px] text-muted-foreground/50">
                +{task.labels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Metadata section - Right Aligned */}
        <div className="flex items-center gap-3 text-muted-foreground/70 shrink-0">
          {/* Stats / Checklist */}
          {task.acceptanceChecklist?.length > 0 && (
            <div
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/30",
                task.acceptanceChecklist.every((i) => i.done) &&
                  "bg-emerald-500/10 text-emerald-600"
              )}
            >
              <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-full h-full stroke-current stroke-3 fill-none opacity-40"
                >
                  <title>Progress</title>
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span className="absolute text-[8px] font-bold">
                  {Math.round(
                    (task.acceptanceChecklist.filter((i) => i.done).length /
                      task.acceptanceChecklist.length) *
                      100
                  )}
                </span>
              </div>
              <span className="text-[10px] font-medium">Progress</span>
            </div>
          )}

          {/* Assignee */}
          <div className="hidden sm:flex items-center gap-1.5">
            {task.assigneeRole && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-primary/80">
                {task.assigneeRole}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative bg-card border rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-muted-foreground/20 cursor-pointer",
        isDragging && "opacity-50 scale-95 rotate-1 shadow-lg",
        selected && "ring-2 ring-primary/50 border-primary/50"
      )}
      onClick={onClick}
    >
      {/* Selection Checkbox - Top Right */}
      {onSelect && (
        <div
          className="absolute top-2 left-2 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <div
            className={cn(
              "w-5 h-5 rounded border-2 transition-all cursor-pointer flex items-center justify-center",
              selected
                ? "bg-primary border-primary"
                : "border-muted-foreground/30 hover:border-primary/50 opacity-0 group-hover:opacity-100"
            )}
          >
            {selected && (
              <svg
                viewBox="0 0 12 12"
                className="w-3 h-3 text-primary-foreground stroke-current"
                fill="none"
                strokeWidth={2.5}
              >
                <title>Selected</title>
                <path d="M2 6 L5 9 L10 3" />
              </svg>
            )}
          </div>
        </div>
      )}

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
