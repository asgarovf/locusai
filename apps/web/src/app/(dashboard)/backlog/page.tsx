"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SprintStatus, type Task } from "@locusai/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Flag,
  Inbox,
  Layers,
  Play,
  Plus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DraggableTask, DroppableSection } from "@/components/dnd";
import { SprintCreateModal } from "@/components/SprintCreateModal";
import { TaskCard } from "@/components/TaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { TaskPanel } from "@/components/TaskPanel";
import { Button, EmptyState, Spinner } from "@/components/ui";
import { useSprintsQuery, useTasksQuery } from "@/hooks";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

export default function BacklogPage() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useTasksQuery();
  const {
    data: sprints = [],
    isLoading: sprintsLoading,
    refetch: refetchSprints,
  } = useSprintsQuery();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["backlog", "active", "planned"])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Group tasks
  const backlogTasks = tasks.filter((t) => !t.sprintId);
  const activeSprint = sprints.find((s) => s.status === SprintStatus.ACTIVE);
  const plannedSprints = sprints.filter(
    (s) => s.status === SprintStatus.PLANNED
  );
  const completedSprints = sprints.filter(
    (s) => s.status === SprintStatus.COMPLETED
  );

  const getSprintTasks = (sprintId: string) =>
    tasks.filter((t) => t.sprintId === sprintId);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetId = over.id as string;

    // Determine new sprint assignment
    let newSprintId: string | null = null;
    if (targetId === "backlog") {
      newSprintId = null;
    } else if (targetId.startsWith("sprint-")) {
      newSprintId = targetId.replace("sprint-", "");
    } else {
      return;
    }

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.sprintId === newSprintId) return;

    try {
      await locusClient.tasks.update(taskId, workspaceId, {
        sprintId: newSprintId || undefined,
      });
      toast.success(
        newSprintId ? "Task moved to sprint" : "Task moved to backlog"
      );
      refetchTasks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to move task"
      );
    }
  };

  // Sprint actions
  const handleCreateSprint = async (name: string) => {
    try {
      setIsSubmitting(true);
      await locusClient.sprints.create(workspaceId, { name });
      toast.success("Sprint created");
      setIsSprintModalOpen(false);
      refetchSprints();
      queryClient.invalidateQueries({
        queryKey: queryKeys.sprints.list(workspaceId),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create sprint"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      setIsSubmitting(true);
      await locusClient.sprints.start(sprintId, workspaceId);
      toast.success("Sprint started");
      refetchSprints();
      queryClient.invalidateQueries({
        queryKey: queryKeys.sprints.list(workspaceId),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start sprint"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try {
      setIsSubmitting(true);
      await locusClient.sprints.complete(sprintId, workspaceId);
      toast.success("Sprint completed");
      refetchSprints();
      queryClient.invalidateQueries({
        queryKey: queryKeys.sprints.list(workspaceId),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to complete sprint"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await locusClient.tasks.delete(taskId, workspaceId);
      toast.success("Task deleted");
      refetchTasks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task"
      );
    }
  };

  if (tasksLoading || sprintsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Backlog</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tasks.length} tasks • {sprints.length} sprints
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsSprintModalOpen(true)}
            >
              <Layers size={18} className="mr-2" />
              New Sprint
            </Button>
            <Button onClick={() => setIsTaskModalOpen(true)}>
              <Plus size={18} className="mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Backlog Section */}
          <Section
            id="backlog"
            title="Backlog"
            icon={<Inbox size={18} />}
            count={backlogTasks.length}
            isExpanded={expandedSections.has("backlog")}
            onToggle={() => toggleSection("backlog")}
            accentColor="slate"
          >
            <DroppableSection id="backlog">
              {backlogTasks.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No tasks in backlog
                </div>
              ) : (
                <div className="space-y-2">
                  {backlogTasks.map((task) => (
                    <DraggableTask key={task.id} task={task}>
                      <TaskCard
                        task={task}
                        onClick={() => setSelectedTaskId(task.id)}
                        onDelete={handleDeleteTask}
                      />
                    </DraggableTask>
                  ))}
                </div>
              )}
            </DroppableSection>
          </Section>

          {/* Active Sprint */}
          {activeSprint && (
            <Section
              id={`sprint-${activeSprint.id}`}
              title={activeSprint.name}
              icon={<Flag size={18} className="text-primary" />}
              count={getSprintTasks(activeSprint.id).length}
              isExpanded={expandedSections.has("active")}
              onToggle={() => toggleSection("active")}
              accentColor="primary"
              badge="Active"
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCompleteSprint(activeSprint.id)}
                  disabled={isSubmitting}
                  className="h-7 text-xs"
                >
                  <CheckCircle size={14} className="mr-1" />
                  Complete
                </Button>
              }
            >
              <DroppableSection id={`sprint-${activeSprint.id}`}>
                {getSprintTasks(activeSprint.id).length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Drag tasks here to add to sprint
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getSprintTasks(activeSprint.id).map((task) => (
                      <DraggableTask key={task.id} task={task}>
                        <TaskCard
                          task={task}
                          onClick={() => setSelectedTaskId(task.id)}
                          onDelete={handleDeleteTask}
                        />
                      </DraggableTask>
                    ))}
                  </div>
                )}
              </DroppableSection>
            </Section>
          )}

          {/* Planned Sprints */}
          {plannedSprints.map((sprint) => (
            <Section
              key={sprint.id}
              id={`sprint-${sprint.id}`}
              title={sprint.name}
              icon={<Layers size={18} />}
              count={getSprintTasks(sprint.id).length}
              isExpanded={expandedSections.has(`planned-${sprint.id}`)}
              onToggle={() => toggleSection(`planned-${sprint.id}`)}
              accentColor="amber"
              badge="Planned"
              actions={
                !activeSprint && (
                  <Button
                    size="sm"
                    onClick={() => handleStartSprint(sprint.id)}
                    disabled={isSubmitting}
                    className="h-7 text-xs"
                  >
                    <Play size={14} className="mr-1" />
                    Start Sprint
                  </Button>
                )
              }
            >
              <DroppableSection id={`sprint-${sprint.id}`}>
                {getSprintTasks(sprint.id).length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Drag tasks here to add to sprint
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getSprintTasks(sprint.id).map((task) => (
                      <DraggableTask key={task.id} task={task}>
                        <TaskCard
                          task={task}
                          onClick={() => setSelectedTaskId(task.id)}
                          onDelete={handleDeleteTask}
                        />
                      </DraggableTask>
                    ))}
                  </div>
                )}
              </DroppableSection>
            </Section>
          ))}

          {/* Completed Sprints */}
          {completedSprints.length > 0 && (
            <Section
              id="completed"
              title="Completed Sprints"
              icon={<Archive size={18} />}
              count={completedSprints.length}
              isExpanded={expandedSections.has("completed")}
              onToggle={() => toggleSection("completed")}
              accentColor="green"
            >
              <div className="space-y-3">
                {completedSprints.map((sprint) => (
                  <div
                    key={sprint.id}
                    className="p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="font-medium text-sm">
                          {sprint.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getSprintTasks(sprint.id).length} tasks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Empty state */}
          {tasks.length === 0 && sprints.length === 0 && (
            <EmptyState
              icon={Inbox}
              title="Start planning"
              description="Create tasks and organize them into sprints"
              action={
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsSprintModalOpen(true)}
                  >
                    <Layers size={18} className="mr-2" />
                    New Sprint
                  </Button>
                  <Button onClick={() => setIsTaskModalOpen(true)}>
                    <Plus size={18} className="mr-2" />
                    New Task
                  </Button>
                </div>
              }
            />
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="opacity-80 rotate-2 shadow-2xl">
            <TaskCard task={activeTask} />
          </div>
        )}
      </DragOverlay>

      {/* Modals */}
      <TaskCreateModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onCreated={() => {
          refetchTasks();
          setIsTaskModalOpen(false);
        }}
      />

      <SprintCreateModal
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        onCreated={handleCreateSprint}
        isSubmitting={isSubmitting}
      />

      {selectedTaskId && (
        <TaskPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={() => {
            refetchTasks();
            setSelectedTaskId(null);
          }}
          onDeleted={() => {
            refetchTasks();
            setSelectedTaskId(null);
          }}
        />
      )}
    </DndContext>
  );
}

// Section Component
function Section({
  id: _id,
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  accentColor,
  badge,
  actions,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  accentColor: "slate" | "primary" | "amber" | "green";
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors = {
    slate: "border-l-slate-400 bg-slate-50/50",
    primary: "border-l-primary bg-primary/5",
    amber: "border-l-amber-400 bg-amber-50/50",
    green: "border-l-green-400 bg-green-50/50",
  };

  const badgeColors = {
    slate: "bg-slate-100 text-slate-700",
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 overflow-hidden transition-all",
        colors[accentColor],
        "border-l-4"
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          {icon}
          <span className="font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
            {count}
          </span>
          {badge && (
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                badgeColors[accentColor]
              )}
            >
              {badge}
            </span>
          )}
        </div>
        {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
      </button>

      {/* Content */}
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
