"use client";

import { type Sprint, SprintStatus, type Task } from "@locusai/shared";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  CheckCircle,
  ChevronRight,
  GripVertical,
  Layers,
  Play,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import React from "react";
import { PageHeader } from "@/components/Header";
import { SprintCreateModal } from "@/components/SprintCreateModal";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { TaskPanel } from "@/components/TaskPanel";
import {
  BacklogSkeleton,
  Button,
  EmptyState,
  PriorityBadge,
  StatusBadge,
} from "@/components/ui";
import { useBacklog } from "@/hooks/useBacklog";
import { cn } from "@/lib/utils";

export function Backlog() {
  const {
    sprints,
    sprintsLoading,
    tasksLoading,
    activeSprints,
    plannedSprints,
    completedSprints,
    backlogTasks,
    searchQuery,
    setSearchQuery,
    isCreatingSprint,
    setIsCreatingSprint,
    isCreateTaskOpen,
    setIsCreateTaskOpen,
    selectedTaskId,
    setSelectedTaskId,
    showCompletedSprints,
    setShowCompletedSprints,
    expandedSprints,
    toggleSprintExpand,
    backlogExpanded,
    toggleBacklogExpand,
    dragOverSection,
    handleDragOver,
    handleDrop,
    handleCreateSprint,
    handleStartSprint,
    handleCompleteSprint,
    handleDeleteSprint,
    getTasksForSprint,
    isSubmittingSprint,
  } = useBacklog();

  if (sprintsLoading || tasksLoading) {
    return <BacklogSkeleton />;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Area */}
      <PageHeader
        title="Product Backlog"
        subtitle={`${backlogTasks.length} items · ${sprints.length} sprints`}
        icon={<Layers className="w-5 h-5 text-primary" />}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsCreatingSprint(true)}
              disabled={isCreatingSprint}
              className="gap-2"
            >
              <Target size={16} />
              New Sprint
            </Button>
            <Button
              onClick={() => setIsCreateTaskOpen(true)}
              className="gap-2 shadow-lg shadow-primary/20"
            >
              <Plus size={16} />
              Create Issue
            </Button>
          </>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
          {/* Active Sprints */}
          {activeSprints.map((sprint) => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              tasks={getTasksForSprint(sprint.id)}
              isExpanded={expandedSprints.has(sprint.id)}
              onToggle={() => toggleSprintExpand(sprint.id)}
              onTaskClick={setSelectedTaskId}
              onMoveTask={(taskId, targetSprintId) =>
                handleDrop(
                  {
                    preventDefault: () => {
                      /* Mock for onMoveTask */
                    },
                    dataTransfer: {
                      getData: () => String(taskId),
                    },
                  } as unknown as React.DragEvent,
                  targetSprintId
                )
              }
              onDragOver={(e) => handleDragOver(e, sprint.id)}
              onDrop={(e) => handleDrop(e, sprint.id)}
              isDragOver={dragOverSection === sprint.id}
              availableSprints={sprints}
              variant="active"
              onAction={() => handleCompleteSprint(sprint)}
              actionLabel="Complete"
              actionIcon={<CheckCircle size={14} />}
            />
          ))}

          {/* Planned Sprints */}
          {plannedSprints.map((sprint) => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              tasks={getTasksForSprint(sprint.id)}
              isExpanded={expandedSprints.has(sprint.id)}
              onToggle={() => toggleSprintExpand(sprint.id)}
              onTaskClick={setSelectedTaskId}
              onMoveTask={(taskId, targetSprintId) =>
                handleDrop(
                  {
                    preventDefault: () => {
                      /* Mock for onMoveTask */
                    },
                    dataTransfer: {
                      getData: () => String(taskId),
                    },
                  } as unknown as React.DragEvent,
                  targetSprintId
                )
              }
              onDragOver={(e) => handleDragOver(e, sprint.id)}
              onDrop={(e) => handleDrop(e, sprint.id)}
              isDragOver={dragOverSection === sprint.id}
              availableSprints={sprints}
              variant="planned"
              onAction={() => handleStartSprint(sprint)}
              actionLabel="Start Sprint"
              actionIcon={<Play size={14} />}
            />
          ))}

          {/* Backlog Section */}
          <motion.div
            layout
            onDragOver={(e) => handleDragOver(e, "backlog")}
            onDrop={(e) => handleDrop(e, null)}
            className={cn(
              "rounded-2xl border transition-all overflow-hidden",
              dragOverSection === "backlog"
                ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                : "border-border/40 bg-card/30 backdrop-blur-sm"
            )}
          >
            <div className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={toggleBacklogExpand}
              >
                <motion.div
                  animate={{ rotate: backlogExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={18} className="text-muted-foreground" />
                </motion.div>
                <div className="flex items-center gap-3">
                  <Archive size={16} className="text-muted-foreground" />
                  <span className="font-semibold text-foreground">Backlog</span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
                    {backlogTasks.length} issues
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs hover:bg-primary/10 hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreateTaskOpen(true);
                }}
              >
                <Plus size={14} />
                Create Issue
              </Button>
            </div>

            <AnimatePresence initial={false} mode="wait">
              {backlogExpanded && (
                <motion.div
                  key="backlog-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border/30">
                    <AnimatePresence mode="wait" initial={false}>
                      {backlogTasks.length === 0 ? (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <EmptyState
                            variant="compact"
                            title="No backlog items"
                            description="Ready for your next big thing"
                            className="py-12 bg-transparent border-none"
                            action={
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsCreateTaskOpen(true)}
                                className="gap-2"
                              >
                                <Plus size={14} />
                                New Issue
                              </Button>
                            }
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="list"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.2 }}
                          className="divide-y divide-border/20"
                        >
                          {backlogTasks.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              onClick={() => setSelectedTaskId(task.id)}
                              onMoveTask={(targetSprintId) =>
                                handleDrop(
                                  {
                                    preventDefault: () => {
                                      /* Mock for onMoveTask */
                                    },
                                    dataTransfer: {
                                      getData: () => String(task.id),
                                    },
                                  } as unknown as React.DragEvent,
                                  targetSprintId
                                )
                              }
                              availableSprints={sprints}
                              currentSprintId={null}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Completed Sprints (Collapsible) */}
          {completedSprints.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border/20">
              <button
                onClick={() => setShowCompletedSprints(!showCompletedSprints)}
                className="flex items-center gap-2 text-xs font-bold text-muted-foreground/60 hover:text-foreground transition-colors uppercase tracking-widest px-4 mb-4"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-md transition-all",
                    showCompletedSprints
                      ? "bg-secondary text-primary"
                      : "bg-transparent"
                  )}
                >
                  <ChevronRight
                    size={14}
                    className={cn(
                      "transition-transform",
                      showCompletedSprints && "rotate-90"
                    )}
                  />
                </div>
                Completed Sprints ({completedSprints.length})
              </button>

              <AnimatePresence>
                {showCompletedSprints && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {completedSprints.map((sprint) => (
                      <SprintSection
                        key={sprint.id}
                        sprint={sprint}
                        tasks={getTasksForSprint(sprint.id)}
                        isExpanded={expandedSprints.has(sprint.id)}
                        onToggle={() => toggleSprintExpand(sprint.id)}
                        onTaskClick={setSelectedTaskId}
                        onMoveTask={(taskId, targetSprintId) =>
                          handleDrop(
                            {
                              preventDefault: () => {
                                /* Mock for onMoveTask */
                              },
                              dataTransfer: {
                                getData: () => String(taskId),
                              },
                            } as unknown as React.DragEvent,
                            targetSprintId
                          )
                        }
                        onDragOver={(e) => handleDragOver(e, sprint.id)}
                        onDrop={(e) => handleDrop(e, sprint.id)}
                        isDragOver={dragOverSection === sprint.id}
                        availableSprints={sprints}
                        variant="completed"
                        onAction={() => handleDeleteSprint(sprint)}
                        actionLabel="Delete"
                        actionIcon={<Trash2 size={14} />}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modals & Overlays */}
      <SprintCreateModal
        isOpen={isCreatingSprint}
        onClose={() => setIsCreatingSprint(false)}
        onCreated={handleCreateSprint}
        isSubmitting={isSubmittingSprint}
      />

      <TaskCreateModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onCreated={() => {
          /* Handled by hook invalidation */
        }}
      />

      <AnimatePresence>
        {selectedTaskId && (
          <TaskPanel
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            onDeleted={() => setSelectedTaskId(null)}
            onUpdated={() => {
              /* Handled by hook invalidation */
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Internal Components

interface SprintSectionProps {
  sprint: Sprint;
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  onTaskClick: (id: number) => void;
  onMoveTask: (taskId: number, targetSprintId: number | null) => void;
  availableSprints: Sprint[];
  variant: "active" | "planned" | "completed";
  onAction: () => void;
  actionLabel: string;
  actionIcon: React.ReactNode;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
}

function SprintSection({
  sprint,
  tasks,
  isExpanded,
  onToggle,
  onTaskClick,
  onMoveTask,
  availableSprints,
  variant,
  onAction,
  actionLabel,
  actionIcon,
  onDragOver,
  onDrop,
  isDragOver,
}: SprintSectionProps) {
  const isActive = variant === "active";
  const isCompleted = variant === "completed";

  return (
    <motion.div
      layout
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border overflow-hidden transition-all",
        isActive
          ? "border-primary/30 bg-primary/2 shadow-lg shadow-primary/5"
          : isCompleted
            ? "border-border/20 bg-secondary/5 opacity-80"
            : "border-border/40 bg-card/30",
        isDragOver && "border-primary ring-1 ring-primary/20 bg-primary/5"
      )}
    >
      <div
        className={cn(
          "w-full flex items-center justify-between p-4 transition-colors",
          isActive
            ? "hover:bg-primary/5"
            : isCompleted
              ? "hover:bg-secondary/10"
              : "hover:bg-secondary/30"
        )}
      >
        <div
          className="flex flex-1 items-center gap-3 cursor-pointer"
          onClick={onToggle}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight
              size={18}
              className={
                isActive
                  ? "text-primary"
                  : isCompleted
                    ? "text-muted-foreground/40"
                    : "text-muted-foreground"
              }
            />
          </motion.div>

          <div className="flex items-center gap-3">
            {isActive && (
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-primary animate-ping" />
              </div>
            )}
            <span
              className={cn(
                "font-semibold",
                isActive
                  ? "text-primary"
                  : isCompleted
                    ? "text-muted-foreground"
                    : "text-foreground"
              )}
            >
              {sprint.name}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
              {tasks.length} issues
            </span>
            {sprint.startDate && isActive && (
              <span
                className="text-xs text-muted-foreground font-mono"
                suppressHydrationWarning
              >
                Started {format(sprint.startDate, "MMM d")}
              </span>
            )}
            {sprint.endDate && isCompleted && (
              <span
                className="text-xs text-muted-foreground/40 font-mono"
                suppressHydrationWarning
              >
                Finished {format(sprint.endDate, "MMM d")}
              </span>
            )}
          </div>
        </div>

        <Button
          variant={isActive ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "gap-1.5 text-xs",
            isActive
              ? "hover:bg-emerald-500/10 hover:text-emerald-600"
              : isCompleted
                ? "hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100"
                : "hover:bg-primary/10 hover:text-primary"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
        >
          {actionIcon}
          {actionLabel}
        </Button>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30">
              <AnimatePresence mode="wait" initial={false}>
                {tasks.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EmptyState
                      variant="minimal"
                      title="No tasks in this sprint"
                      description="Drag tasks here to include them in the sprint"
                      className="py-10"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="divide-y divide-border/20"
                  >
                    {tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task.id)}
                        onMoveTask={(targetSprintId) =>
                          onMoveTask(task.id, targetSprintId)
                        }
                        availableSprints={availableSprints.filter(
                          (s) =>
                            s.id !== sprint.id &&
                            s.status !== SprintStatus.COMPLETED
                        )}
                        currentSprintId={sprint.id}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TaskRow({
  task,
  onClick,
  onMoveTask,
  availableSprints,
  currentSprintId,
}: {
  task: Task;
  onClick: () => void;
  onMoveTask: (targetSprintId: number | null) => void;
  availableSprints: Sprint[];
  currentSprintId: number | null;
}) {
  return (
    <motion.div
      layout
      draggable
      onDragStartCapture={(e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData("taskId", String(task.id));
          e.dataTransfer.effectAllowed = "move";
        }
      }}
      className="group flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="text-muted-foreground/30 group-hover:text-primary/60 transition-colors cursor-grab active:cursor-grabbing">
        <GripVertical size={14} />
      </div>

      <PriorityBadge priority={task.priority} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground/60 group-hover:text-primary transition-colors">
            LCS-{task.id}
          </span>
          <span className="text-sm font-medium text-foreground/90 truncate group-hover:text-foreground transition-colors">
            {task.title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={task.status} />
        {task.assigneeRole && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary border border-border/50 text-muted-foreground">
            {task.assigneeRole}
          </span>
        )}
      </div>

      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <select
          className="appearance-none bg-secondary/50 hover:bg-secondary text-xs font-medium text-muted-foreground px-2 py-1 rounded-md border border-border/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          value=""
          onChange={(e) => {
            const val = e.target.value;
            if (val === "backlog") onMoveTask(null);
            else if (val) onMoveTask(Number(val));
          }}
        >
          <option value="" disabled>
            Move →
          </option>
          {currentSprintId !== null && (
            <option value="backlog">→ Backlog</option>
          )}
          {availableSprints
            .filter((s) => s.status !== SprintStatus.COMPLETED)
            .map((s) => (
              <option key={s.id} value={s.id}>
                → {s.name}
              </option>
            ))}
        </select>
      </div>
    </motion.div>
  );
}
