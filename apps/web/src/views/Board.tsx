"use client";

import { SprintStatus, TaskStatus } from "@locusai/shared";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { MoreHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BoardFilter } from "@/components/BoardFilter";
import { TaskCard } from "@/components/TaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { TaskPanel } from "@/components/TaskPanel";
import { Button } from "@/components/ui/Button";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { sprintService } from "@/services";

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
  const router = useRouter();
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

  const { data: sprints = [] } = useQuery({
    queryKey: ["sprints"],
    queryFn: sprintService.getAll,
  });

  const activeSprint = sprints.find((s) => s.status === SprintStatus.ACTIVE);

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

  if (!activeSprint) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="bg-primary/5 p-4 rounded-full">
          <svg
            className="w-12 h-12 text-primary/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold">No Active Sprint</h2>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            You need to start a sprint from the Backlog to see tasks on the
            board.
          </p>
        </div>
        <Button onClick={() => router.push("/backlog")} variant="secondary">
          Go to Backlog
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {activeSprint.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                Active
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-3">
              Track and manage engineering tasks
              <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary/60 text-[10px] font-semibold text-muted-foreground">
                <kbd className="bg-background/80 px-1.5 py-0.5 rounded text-[9px] font-bold border">
                  N
                </kbd>
                New task
              </span>
            </p>
          </div>
          <Button
            onClick={() => handleOpenCreateModal(TaskStatus.BACKLOG)}
            className="shadow-lg shadow-primary/20"
          >
            <Plus size={16} className="mr-1.5" />
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
      <div className="flex gap-4 min-h-[600px] pb-4">
        {COLUMNS.map((status) => {
          // Filter tasks by active sprint ID
          const columnTasks = getTasksByStatus(status).filter(
            (t) => t.sprintId === activeSprint.id
          );
          const isDragOver = dragOverColumn === status;

          return (
            <div
              key={status}
              className={cn(
                "flex flex-col w-[280px] shrink-0 rounded-xl transition-all border",
                isDragOver
                  ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                  : "bg-card/50 border-border/50"
              )}
              onDrop={(e) => handleDrop(status, e)}
              onDragOver={(e) => handleDragOver(status, e)}
              onDragLeave={handleDragLeave}
            >
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      STATUS_CONFIG[status].indicator
                    )}
                  />
                  <span className="text-xs font-semibold text-foreground">
                    {STATUS_CONFIG[status].label}
                  </span>
                  <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 bg-secondary/80 text-[10px] font-bold rounded-md text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-2.5 p-2.5 flex-1 overflow-y-auto">
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
                  className="w-full justify-center text-xs font-medium text-muted-foreground/60 hover:text-foreground hover:bg-secondary/40 h-8 border border-dashed border-border/50 hover:border-border rounded-lg"
                  onClick={() => handleOpenCreateModal(status)}
                >
                  <Plus size={14} className="mr-1.5" />
                  Add
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
        sprintId={activeSprint?.id}
      />

      <AnimatePresence>
        {selectedTaskId && (
          <TaskPanel
            key="task-panel"
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            onDeleted={refreshTasks}
            onUpdated={refreshTasks}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
