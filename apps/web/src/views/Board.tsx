"use client";

import { TaskStatus } from "@locusai/shared";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, MoreHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { BoardFilter } from "@/components/BoardFilter";
import { PageHeader } from "@/components/Header";
import { TaskCard } from "@/components/TaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { TaskPanel } from "@/components/TaskPanel";
import { BoardSkeleton, Button, EmptyState } from "@/components/ui";
import { useBoard, useGlobalKeydowns } from "@/hooks";
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
  const router = useRouter();
  const {
    loading,
    activeSprint,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    hasActiveFilters,
    clearFilters,
    getTasksByStatus,
    deleteTask,
    refreshTasks,
    isCreateModalOpen,
    setIsCreateModalOpen,
    createModalStatus,
    handleOpenCreateModal,
    selectedTaskId,
    setSelectedTaskId,
    dragOverColumn,
    handleDrop,
    handleDragOver,
    handleDragLeave,
  } = useBoard();

  useGlobalKeydowns({
    onOpenCreateTask: () => {
      // Sidebar handles navigation to backlog
    },
    onOpenCreateSprint: () => {
      // Sidebar handles navigation to backlog
    },
    onCloseCreateTask: () => {
      if (selectedTaskId) setSelectedTaskId(null);
    },
  });

  if (loading) {
    return <BoardSkeleton />;
  }

  if (!activeSprint) {
    return (
      <div className="h-[calc(100vh-160px)] flex items-center justify-center">
        <EmptyState
          icon={LayoutDashboard}
          title="Mission Suspended"
          description="No active sprint stream detected. Initialize a mission from the Command Center to begin operations."
          action={
            <Button
              onClick={() => router.push("/backlog")}
              variant="secondary"
              className="h-11 px-8 font-black uppercase tracking-widest text-[10px] rounded-xl border-border/40"
            >
              Go to Backlog
            </Button>
          }
          className="max-w-lg scale-110"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-background">
      <PageHeader
        title={activeSprint.name}
        subtitle="Mission Control • Real-time Task Orchestration"
        icon={<LayoutDashboard className="w-5 h-5 text-primary" />}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        actions={
          <Button
            onClick={() => handleOpenCreateModal(TaskStatus.BACKLOG)}
            className="h-11 px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 rounded-xl"
          >
            <Plus size={16} className="mr-2" />
            Initialize Task
          </Button>
        }
      >
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Active Session
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-secondary/40 border border-border/20">
            <kbd className="bg-background/80 px-1.5 py-0.5 rounded text-[9px] font-black border border-border/40 text-muted-foreground/60">
              N
            </kbd>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
              New Operation
            </span>
          </div>
        </div>
      </PageHeader>

      <div className="px-8 pb-4">
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
      </div>

      <div className="flex-1 overflow-x-auto px-8 pb-10 scrollbar-thin">
        <div className="flex gap-6 h-full min-w-max">
          {COLUMNS.map((status) => {
            const columnTasks = getTasksByStatus(status).filter(
              (t) => t.sprintId === activeSprint.id
            );
            const isDragOver = dragOverColumn === status;

            return (
              <div
                key={status}
                className={cn(
                  "flex flex-col w-[320px] rounded-2xl transition-all duration-300 border relative",
                  isDragOver
                    ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] scale-[1.02] z-10"
                    : "bg-card/20 border-border/40"
                )}
                onDrop={(e) => handleDrop(status, e)}
                onDragOver={(e) => handleDragOver(status, e)}
                onDragLeave={handleDragLeave}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/40 bg-card/10 backdrop-blur-sm rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]",
                        STATUS_CONFIG[status].indicator.replace("bg-", "text-")
                      )}
                    />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">
                      {STATUS_CONFIG[status].label}
                    </span>
                    <div className="flex items-center justify-center h-5 px-2 bg-secondary/50 text-[9px] font-black rounded-lg text-muted-foreground border border-border/20">
                      {columnTasks.length}
                    </div>
                  </div>
                  <button className="p-1.5 rounded-xl hover:bg-secondary/60 text-muted-foreground/40 hover:text-foreground transition-all">
                    <MoreHorizontal size={14} />
                  </button>
                </div>

                {/* Task List */}
                <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto scrollbar-none hover:scrollbar-thin transition-all">
                  <AnimatePresence mode="popLayout">
                    {columnTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <TaskCard
                          task={task}
                          onClick={() => setSelectedTaskId(task.id)}
                          onDelete={deleteTask}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <Button
                    variant="ghost"
                    className="w-full justify-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-primary hover:bg-primary/5 h-10 border border-dashed border-border/20 hover:border-primary/40 rounded-xl transition-all group"
                    onClick={() => handleOpenCreateModal(status)}
                  >
                    <Plus
                      size={14}
                      className="mr-2 group-hover:rotate-90 transition-transform"
                    />
                    Add Node
                  </Button>
                </div>

                {/* Drag Over Overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 bg-primary/2 rounded-2xl pointer-events-none animate-pulse border-2 border-primary/20" />
                )}
              </div>
            );
          })}
        </div>
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
