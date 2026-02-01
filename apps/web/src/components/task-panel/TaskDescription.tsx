/**
 * Task Description Component
 *
 * Displays and allows editing of task title and description.
 * Always-editable mode with auto-save and save status indicators.
 * Integrates with useTaskPanel for optimistic updates.
 *
 * @example
 * <TaskDescription task={task} onUpdate={handleUpdate} isLoading={isLoading} />
 */

"use client";

import { type Task } from "@locusai/shared";
import { AlertCircle, Check, Edit, FileText, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Editor } from "@/components/Editor";
import { SectionLabel } from "@/components/typography";
import { Button, Input } from "@/components/ui";
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
 * - Always-editable description with markdown support
 * - Auto-save with status indicator
 * - Save button for manual save
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
    hasUnsavedChanges,
    saveStatus,
    setSaveStatus,
  } = useTaskDescription({ task, onUpdate });

  // Auto-save timer for description changes
  const saveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  // Timer for hiding "Saved" status
  const savedStatusTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  // Store latest values in refs to avoid stale closures
  const handleDescSaveRef = useRef(handleDescSave);
  const setSaveStatusRef = useRef(setSaveStatus);

  // Keep refs updated
  useEffect(() => {
    handleDescSaveRef.current = handleDescSave;
    setSaveStatusRef.current = setSaveStatus;
  }, [handleDescSave, setSaveStatus]);

  // Auto-save effect - triggers when editDesc changes and there are unsaved changes
  // We use editDesc in the effect body to ensure the timer resets on each keystroke
  useEffect(() => {
    // Use editDesc to ensure the effect runs on every content change
    const currentDesc = editDesc;
    if (!hasUnsavedChanges || currentDesc === undefined) {
      return;
    }

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer for auto-save
    saveTimerRef.current = setTimeout(() => {
      setSaveStatusRef.current("saving");
      handleDescSaveRef.current();
      // After save, show "saved" status briefly
      setSaveStatusRef.current("saved");
      // Clear saved status after 2 seconds
      if (savedStatusTimerRef.current) {
        clearTimeout(savedStatusTimerRef.current);
      }
      savedStatusTimerRef.current = setTimeout(() => {
        setSaveStatusRef.current("idle");
      }, 2000);
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, editDesc]);

  // Cleanup saved status timer on unmount
  useEffect(() => {
    return () => {
      if (savedStatusTimerRef.current) {
        clearTimeout(savedStatusTimerRef.current);
      }
    };
  }, []);

  const handleManualSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (savedStatusTimerRef.current) {
      clearTimeout(savedStatusTimerRef.current);
    }
    setSaveStatus("saving");
    handleDescSave();
    setSaveStatus("saved");
    savedStatusTimerRef.current = setTimeout(() => {
      setSaveStatus("idle");
    }, 2000);
  };

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      {/* Title Section */}
      <div className="mb-6 shrink-0">
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
              <FileText size={16} aria-hidden="true" />
            </div>
            <SectionLabel as="h4">Technical Documentation</SectionLabel>
          </div>
          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            {hasUnsavedChanges && saveStatus === "idle" && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <span className="text-xs font-medium">Unsaved changes</span>
              </div>
            )}
            {saveStatus === "saving" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2
                  size={14}
                  className="animate-spin"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium">Saving...</span>
              </div>
            )}
            {saveStatus === "saved" && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-500 animate-in fade-in duration-200">
                <Check size={14} aria-hidden="true" />
                <span className="text-xs font-medium">Saved</span>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
                <AlertCircle size={14} aria-hidden="true" />
                <span className="text-xs font-medium">Save failed</span>
              </div>
            )}
            {/* Save button - shows when there are unsaved changes or during saving/error */}
            {(hasUnsavedChanges || saveStatus === "saving" || saveStatus === "error") && (
              <Button
                size="sm"
                onClick={handleManualSave}
                disabled={isLoading || saveStatus === "saving"}
                className="h-8 px-4 text-xs font-semibold"
              >
                Save
              </Button>
            )}
          </div>
        </div>

        <div
          className={cn(
            "border border-border/40 rounded-2xl overflow-hidden bg-secondary/5 shadow-inner min-h-[300px] md:min-h-[400px]",
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
            readOnly={false}
            placeholder="Define implementation architecture, requirements, and scope..."
          />
        </div>
      </div>
    </div>
  );
}
