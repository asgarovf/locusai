/**
 * Task Description Component
 *
 * Displays and allows editing of task title and description.
 * Supports markdown editing and preview modes.
 * Integrates with useTaskPanel for optimistic updates.
 *
 * @example
 * <TaskDescription task={task} onUpdate={handleUpdate} isLoading={isLoading} />
 */

"use client";

import { type Task } from "@locusai/shared";
import { Edit, FileText, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Editor } from "@/components/Editor";
import { SectionLabel } from "@/components/typography";
import { Input } from "@/components/ui";
import { useTaskDescription } from "@/hooks/useTaskDescription";
import { cn } from "@/lib/utils";

interface TaskDescriptionProps {
  /** Task to display */
  task: Task;
  /** Whether a task mutation is loading */
  isLoading?: boolean;
  /** Callback when task is updated */
  onUpdate: (updates: Partial<Task>) => void;
}

/**
 * Task Description Component
 *
 * Features:
 * - Editable title with inline editing
 * - Description with markdown support
 * - Preview/Edit mode toggle
 * - Auto-save on blur
 * - Loading states during mutations
 *
 * @component
 */
export function TaskDescription({
  task,
  isLoading = false,
  onUpdate,
}: TaskDescriptionProps) {
  const {
    isEditingTitle,
    editTitle,
    setIsEditingTitle,
    setEditTitle,
    handleTitleSave,
    editDesc,
    setEditDesc,
    handleDescSave,
    descMode,
    setDescMode,
  } = useTaskDescription({ task, onUpdate });

  // Auto-save timer for description changes
  const saveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (editDesc !== task.description && descMode === "edit") {
      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Set new timer for auto-save
      saveTimerRef.current = setTimeout(() => {
        handleDescSave();
      }, 1000);
    }

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [editDesc, task.description, descMode, handleDescSave]);

  return (
    <div className="px-8 py-8">
      {/* Title Section */}
      <div className="mb-8 shrink-0">
        {isEditingTitle ? (
          <div className="relative">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) handleTitleSave();
                if (e.key === "Escape") {
                  setEditTitle(task.title);
                  setIsEditingTitle(false);
                }
              }}
              className="text-3xl h-16 font-black tracking-tight bg-secondary/20 border-primary/20 rounded-2xl px-6"
              autoFocus
              aria-label="Edit task title"
            />
            {isLoading && (
              <Loader2
                size={20}
                className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary"
                aria-hidden="true"
              />
            )}
          </div>
        ) : (
          <h2
            className={cn(
              "text-3xl font-black tracking-tight transition-all cursor-pointer leading-tight group flex items-start",
              isLoading ? "opacity-50" : "hover:text-primary"
            )}
            onClick={() => !isLoading && setIsEditingTitle(true)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !isLoading) {
                setIsEditingTitle(true);
              }
            }}
            aria-label="Task title - click to edit"
          >
            {task.title}
            {!isLoading && (
              <Edit
                size={18}
                className="ml-4 mt-1.5 opacity-0 group-hover:opacity-40 transition-opacity"
                aria-hidden="true"
              />
            )}
          </h2>
        )}
      </div>

      {/* Description Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
              <FileText size={16} aria-hidden="true" />
            </div>
            <SectionLabel as="h4">Technical Documentation</SectionLabel>
          </div>
          <div className="flex bg-secondary/40 p-1 rounded-xl border border-border/20 shadow-inner">
            <button
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                descMode === "preview"
                  ? "bg-background shadow-md text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !isLoading && setDescMode("preview")}
              disabled={isLoading}
              aria-pressed={descMode === "preview"}
            >
              Visual
            </button>
            <button
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                descMode === "edit"
                  ? "bg-background shadow-md text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !isLoading && setDescMode("edit")}
              disabled={isLoading}
              aria-pressed={descMode === "edit"}
            >
              Markdown
            </button>
          </div>
        </div>

        <div
          className={cn(
            "border border-border/40 rounded-2xl overflow-hidden bg-secondary/5 shadow-inner min-h-[500px]",
            isLoading && "opacity-60 pointer-events-none"
          )}
        >
          <Editor
            value={editDesc}
            onChange={(newValue) => {
              if (!isLoading) {
                setEditDesc(newValue);
              }
            }}
            readOnly={descMode === "preview"}
            placeholder="Define implementation architecture, requirements, and scope..."
          />
        </div>
      </div>
    </div>
  );
}
