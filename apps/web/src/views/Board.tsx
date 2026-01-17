"use client";

import { TaskStatus } from "@locus/shared";
import { MoreHorizontal, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BoardFilter } from "@/components/BoardFilter";
import { TaskCard } from "@/components/TaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { TaskPanel } from "@/components/TaskPanel";
import { Button } from "@/components/ui/Button";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

const COLUMNS = [
  TaskStatus.BACKLOG,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.VERIFICATION,
  TaskStatus.DONE,
  TaskStatus.BLOCKED,
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; indicator: string }
> = {
  [TaskStatus.BACKLOG]: {
    label: "Backlog",
    color: "var(--status-backlog)",
    indicator: "bg-slate-500",
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    color: "var(--status-progress)",
    indicator: "bg-amber-500",
  },
  [TaskStatus.REVIEW]: {
    label: "Review",
    color: "var(--status-review)",
    indicator: "bg-purple-500",
  },
  [TaskStatus.VERIFICATION]: {
    label: "Verification",
    color: "var(--accent)",
    indicator: "bg-cyan-500",
  },
  [TaskStatus.DONE]: {
    label: "Done",
    color: "var(--status-done)",
    indicator: "bg-emerald-500",
  },
  [TaskStatus.BLOCKED]: {
    label: "Blocked",
    color: "var(--status-blocked)",
    indicator: "bg-rose-500",
  },
};

export function Board() {
  const {
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    hasActiveFilters,
    clearFilters,
    getTasksByStatus,
    updateTaskStatus,
    deleteTask,
    refreshTasks,
  } = useTasks();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalStatus, setCreateModalStatus] = useState<TaskStatus>(
    TaskStatus.BACKLOG
  );
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const handleOpenCreateModal = useCallback((status: TaskStatus) => {
    setCreateModalStatus(status);
    setIsCreateModalOpen(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleOpenCreateModal(TaskStatus.BACKLOG);
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const searchInput = document.querySelector(
          ".search-input"
        ) as HTMLInputElement;
        searchInput?.focus();
      }
      if (e.key === "Escape" && selectedTaskId) {
        setSelectedTaskId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedTaskId, handleOpenCreateModal]);

  const handleDrop = async (status: TaskStatus, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    await updateTaskStatus(Number(taskId), status);
  };

  const handleDragOver = (status: TaskStatus, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="mb-8">
        <div className="flex justify-between items-center bg-card p-6 rounded-xl border shadow-sm">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
              Development Board
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              Manage tasks and track progress across the engineering pipeline.
              <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">
                Press <kbd className="bg-background px-1 rounded border">N</kbd>{" "}
                for new task
              </span>
            </p>
          </div>
          <Button onClick={() => handleOpenCreateModal(TaskStatus.BACKLOG)}>
            <Plus size={18} className="mr-1" />
            New Task
          </Button>
        </div>
      </div>

      <BoardFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeChange={setAssigneeFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="flex gap-6 min-h-[600px]">
        {COLUMNS.map((status) => {
          const columnTasks = getTasksByStatus(status);
          const isDragOver = dragOverColumn === status;

          return (
            <div
              key={status}
              className={cn(
                "flex flex-col w-[300px] shrink-0 rounded-xl transition-all",
                isDragOver
                  ? "bg-accent/10 ring-2 ring-accent"
                  : "bg-secondary/20"
              )}
              onDrop={(e) => handleDrop(status, e)}
              onDragOver={(e) => handleDragOver(status, e)}
              onDragLeave={handleDragLeave}
            >
              <div className="flex items-center justify-between p-3 border-b bg-card rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]",
                      STATUS_CONFIG[status].indicator
                    )}
                  />
                  <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                    {STATUS_CONFIG[status].label}
                  </span>
                  <span className="flex items-center justify-center h-5 px-1.5 bg-secondary text-[10px] font-bold rounded-full text-muted-foreground border">
                    {columnTasks.length}
                  </span>
                </div>
                <button className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTaskId(task.id)}
                    onDelete={deleteTask}
                  />
                ))}

                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 h-9"
                  onClick={() => handleOpenCreateModal(status)}
                >
                  <Plus size={14} className="mr-2" />
                  <span>Add task</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={refreshTasks}
        initialStatus={createModalStatus}
      />

      {selectedTaskId && (
        <TaskPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onDeleted={refreshTasks}
          onUpdated={refreshTasks}
        />
      )}
    </div>
  );
}
