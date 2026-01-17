"use client";

import { type Sprint, SprintStatus, type Task } from "@locusai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Sparkles,
  Target,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { TaskPanel } from "@/components/TaskPanel";
import { Button, Input, PriorityBadge, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { sprintService } from "@/services/sprint.service";
import { taskService } from "@/services/task.service";

export function Backlog() {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [showCompletedSprints, setShowCompletedSprints] = useState(false);
  const [expandedSprints, setExpandedSprints] = useState<Set<number>>(
    new Set()
  );
  const [backlogExpanded, setBacklogExpanded] = useState(true);

  const { data: sprints = [] } = useQuery({
    queryKey: ["sprints"],
    queryFn: sprintService.getAll,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: taskService.getAll,
  });

  const createSprint = useMutation({
    mutationFn: sprintService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      setIsCreatingSprint(false);
      setNewSprintName("");
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Task> }) =>
      taskService.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateSprint = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Sprint> }) =>
      sprintService.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sprints"] }),
  });

  const deleteSprint = useMutation({
    mutationFn: (id: number) => sprintService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const handleCreateSprint = () => {
    if (!newSprintName.trim()) return;
    createSprint.mutate({ name: newSprintName });
  };

  const handleStartSprint = (sprint: Sprint) => {
    updateSprint.mutate({
      id: sprint.id,
      updates: {
        status: SprintStatus.ACTIVE,
        startDate: Date.now(),
      },
    });
  };

  const handleCompleteSprint = (sprint: Sprint) => {
    updateSprint.mutate({
      id: sprint.id,
      updates: {
        status: SprintStatus.COMPLETED,
        endDate: Date.now(),
      },
    });
  };

  const toggleSprintExpand = (sprintId: number) => {
    setExpandedSprints((prev) => {
      const next = new Set(prev);
      if (next.has(sprintId)) next.delete(sprintId);
      else next.add(sprintId);
      return next;
    });
  };

  const backlogTasks = tasks.filter((t: Task) => !t.sprintId);
  const activeSprints = sprints.filter(
    (s: Sprint) => s.status === SprintStatus.ACTIVE
  );
  const plannedSprints = sprints.filter(
    (s: Sprint) => s.status === SprintStatus.PLANNED
  );
  const completedSprints = sprints.filter(
    (s: Sprint) => s.status === SprintStatus.COMPLETED
  );

  const handleDeleteSprint = (sprint: Sprint) => {
    if (
      confirm(
        `Delete "${sprint.name}" and all its tasks? This cannot be undone.`
      )
    ) {
      deleteSprint.mutate(sprint.id);
    }
  };

  const getTasksForSprint = (sprintId: number) =>
    tasks.filter((t: Task) => t.sprintId === sprintId);

  return (
    <div className="h-full flex flex-col bg-linear-to-br from-background via-background to-secondary/5">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border/30 bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Product Backlog
              </h1>
              <p className="text-sm text-muted-foreground">
                {tasks.length} items · {sprints.length} sprints
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
          </div>
        </div>

        {/* Sprint Creation Inline */}
        <AnimatePresence>
          {isCreatingSprint && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 mt-4 pt-4 border-t border-border/30 max-w-lg">
                <Input
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  placeholder="Sprint name (e.g. Sprint 24)"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreateSprint()}
                  className="flex-1"
                />
                <Button
                  onClick={handleCreateSprint}
                  disabled={!newSprintName.trim()}
                  size="sm"
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreatingSprint(false);
                    setNewSprintName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-6 space-y-4">
          {/* Active Sprints */}
          {activeSprints.map((sprint) => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              tasks={getTasksForSprint(sprint.id)}
              isExpanded={expandedSprints.has(sprint.id)}
              onToggle={() => toggleSprintExpand(sprint.id)}
              onTaskClick={setSelectedTask}
              onMoveTask={(taskId, targetSprintId) =>
                updateTask.mutate({
                  id: taskId,
                  updates: { sprintId: targetSprintId },
                })
              }
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
              onTaskClick={setSelectedTask}
              onMoveTask={(taskId, targetSprintId) =>
                updateTask.mutate({
                  id: taskId,
                  updates: { sprintId: targetSprintId },
                })
              }
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
            className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => setBacklogExpanded(!backlogExpanded)}
              >
                <motion.div
                  animate={{ rotate: backlogExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={18} className="text-muted-foreground" />
                </motion.div>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <span className="font-semibold text-foreground">Backlog</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
                  {backlogTasks.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 text-muted-foreground hover:text-primary"
                onClick={() => setIsCreateTaskOpen(true)}
              >
                <Plus size={14} />
                Add
              </Button>
            </div>

            <AnimatePresence>
              {backlogExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border/30">
                    {backlogTasks.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/50 mb-3">
                          <Zap className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No items in backlog
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-primary"
                          onClick={() => setIsCreateTaskOpen(true)}
                        >
                          Create your first issue
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/20">
                        {backlogTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onClick={() => setSelectedTask(task.id)}
                            onMoveTask={(targetSprintId) =>
                              updateTask.mutate({
                                id: task.id,
                                updates: { sprintId: targetSprintId },
                              })
                            }
                            availableSprints={sprints.filter(
                              (s) => s.status !== SprintStatus.COMPLETED
                            )}
                            currentSprintId={null}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Completed Sprints */}
          {completedSprints.length > 0 && (
            <motion.div
              layout
              className="rounded-2xl border border-border/30 bg-background/50 overflow-hidden"
            >
              <button
                onClick={() => setShowCompletedSprints(!showCompletedSprints)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: showCompletedSprints ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight
                      size={18}
                      className="text-muted-foreground/50"
                    />
                  </motion.div>
                  <div className="flex items-center gap-2">
                    <Archive size={16} className="text-muted-foreground/50" />
                    <span className="font-medium text-muted-foreground">
                      Completed Sprints
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-secondary/50 text-[11px] font-bold text-muted-foreground/60">
                    {completedSprints.length}
                  </span>
                </div>
              </button>

              <AnimatePresence>
                {showCompletedSprints && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/30 divide-y divide-border/20">
                      {completedSprints.map((sprint) => (
                        <div
                          key={sprint.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-secondary/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle
                              size={14}
                              className="text-emerald-500/60"
                            />
                            <span className="text-sm font-medium text-muted-foreground">
                              {sprint.name}
                            </span>
                            <span className="text-xs text-muted-foreground/50 font-mono">
                              {getTasksForSprint(sprint.id).length} tasks
                            </span>
                            {sprint.endDate && (
                              <span
                                className="text-xs text-muted-foreground/40"
                                suppressHydrationWarning
                              >
                                Completed{" "}
                                {format(sprint.endDate, "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteSprint(sprint)}
                          >
                            <Trash2 size={14} className="mr-1" />
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Task Create Modal */}
      <TaskCreateModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          setIsCreateTaskOpen(false);
        }}
      />

      {/* Task Panel */}
      <AnimatePresence>
        {selectedTask && (
          <TaskPanel
            taskId={selectedTask}
            onClose={() => setSelectedTask(null)}
            onDeleted={() => {
              setSelectedTask(null);
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
            }}
            onUpdated={() =>
              queryClient.invalidateQueries({ queryKey: ["tasks"] })
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Sprint Section Component
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
}: {
  sprint: Sprint;
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  onTaskClick: (id: number) => void;
  onMoveTask: (taskId: number, targetSprintId: number | null) => void;
  availableSprints: Sprint[];
  variant: "active" | "planned";
  onAction: () => void;
  actionLabel: string;
  actionIcon: React.ReactNode;
}) {
  const isActive = variant === "active";

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border overflow-hidden transition-all",
        isActive
          ? "border-primary/30 bg-primary/2 shadow-lg shadow-primary/5"
          : "border-border/40 bg-card/30"
      )}
    >
      <div
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-colors",
          isActive ? "hover:bg-primary/5" : "hover:bg-secondary/30"
        )}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight
              size={18}
              className={isActive ? "text-primary" : "text-muted-foreground"}
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
                isActive ? "text-primary" : "text-foreground"
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
          </div>
        </div>

        <Button
          variant={isActive ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "gap-1.5 text-xs",
            isActive
              ? "hover:bg-emerald-500/10 hover:text-emerald-600"
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

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30">
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground/60">
                  Drag issues here or move from backlog
                </div>
              ) : (
                <div className="divide-y divide-border/20">
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
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Task Row Component
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
      className="group flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="opacity-0 group-hover:opacity-40 transition-opacity cursor-grab">
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

      {/* Move dropdown */}
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
          {availableSprints.map((s) => (
            <option key={s.id} value={s.id}>
              → {s.name}
            </option>
          ))}
        </select>
      </div>
    </motion.div>
  );
}
