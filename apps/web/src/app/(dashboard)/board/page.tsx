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
import { SprintStatus, type Task, TaskStatus } from "@locusai/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Filter, Inbox, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DraggableTask, DroppableSection } from "@/components/dnd";
import { TaskCard } from "@/components/TaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { TaskPanel } from "@/components/TaskPanel";
import { Button, EmptyState, Spinner } from "@/components/ui";
import { useSprintsQuery, useTasksQuery } from "@/hooks";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const STATUSES = [
  { key: TaskStatus.BACKLOG, label: "Backlog", color: "bg-slate-500" },
  { key: TaskStatus.IN_PROGRESS, label: "In Progress", color: "bg-blue-500" },
  { key: TaskStatus.REVIEW, label: "Review", color: "bg-purple-500" },
  {
    key: TaskStatus.VERIFICATION,
    label: "Verification",
    color: "bg-amber-500",
  },
  { key: TaskStatus.DONE, label: "Done", color: "bg-green-500" },
  { key: TaskStatus.BLOCKED, label: "Blocked", color: "bg-red-500" },
];

export default function BoardPage() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch,
  } = useTasksQuery();
  const { data: sprints = [], isLoading: sprintsLoading } = useSprintsQuery();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showActiveSprintOnly, setShowActiveSprintOnly] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Get active sprint
  const activeSprint = sprints.find((s) => s.status === SprintStatus.ACTIVE);

  // Filter tasks based on filter
  const filteredTasks =
    showActiveSprintOnly && activeSprint
      ? tasks.filter((t) => t.sprintId === activeSprint.id)
      : tasks;

  // Group by status
  const tasksByStatus = STATUSES.reduce(
    (acc, status) => {
      acc[status.key] = filteredTasks.filter((t) => t.status === status.key);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await locusClient.tasks.update(taskId, workspaceId, {
        status: newStatus,
      });
      toast.success("Task updated");
      refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update task"
      );
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await locusClient.tasks.delete(taskId, workspaceId);
      toast.success("Task deleted");
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(workspaceId),
      });
      refetch();
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
      <div className="flex flex-col h-full gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Board</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeSprint ? (
                <>
                  <span className="text-primary font-medium">
                    {activeSprint.name}
                  </span>
                  <span className="mx-2">•</span>
                  {filteredTasks.length} tasks
                </>
              ) : (
                <>{filteredTasks.length} tasks</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowActiveSprintOnly(!showActiveSprintOnly)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  showActiveSprintOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <Filter size={14} />
                {showActiveSprintOnly ? "Active Sprint" : "All Tasks"}
                {showActiveSprintOnly && (
                  <X
                    size={14}
                    className="ml-1 hover:bg-primary-foreground/20 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActiveSprintOnly(false);
                    }}
                  />
                )}
              </button>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              <Plus size={16} className="mr-1" />
              Task
            </Button>
          </div>
        </div>

        {/* No active sprint warning */}
        {!activeSprint && showActiveSprintOnly && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            No active sprint. Showing all tasks or start a sprint from the
            Backlog.
          </div>
        )}

        {/* Kanban Board */}
        {filteredTasks.length === 0 && !activeTask ? (
          <EmptyState
            icon={Inbox}
            title="No tasks"
            description={
              showActiveSprintOnly && activeSprint
                ? "Add tasks to the active sprint from the Backlog"
                : "Create your first task to get started"
            }
            action={
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={18} className="mr-2" />
                New Task
              </Button>
            }
          />
        ) : (
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-3 h-full min-w-min pb-4">
              {STATUSES.map((status) => (
                <div
                  key={status.key}
                  className="flex flex-col w-72 flex-shrink-0"
                >
                  {/* Column Header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={cn("w-2 h-2 rounded-full", status.color)} />
                    <span className="text-sm font-semibold text-foreground">
                      {status.label}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {tasksByStatus[status.key]?.length || 0}
                    </span>
                  </div>

                  {/* Column Content */}
                  <DroppableSection id={status.key}>
                    <div className="flex-1 rounded-lg bg-muted/30 p-2 min-h-[calc(100vh-220px)]">
                      {tasksByStatus[status.key]?.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                          Drop here
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tasksByStatus[status.key]?.map((task) => (
                            <DraggableTask key={task.id} task={task}>
                              <TaskCard
                                task={task}
                                onClick={() => setSelectedTaskId(task.id)}
                                onDelete={handleDeleteTask}
                                compact
                              />
                            </DraggableTask>
                          ))}
                        </div>
                      )}
                    </div>
                  </DroppableSection>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="opacity-90 rotate-2 shadow-2xl">
            <TaskCard task={activeTask} compact />
          </div>
        )}
      </DragOverlay>

      {/* Modals */}
      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          refetch();
          setIsCreateModalOpen(false);
        }}
        defaultSprintId={activeSprint?.id}
      />

      {selectedTaskId && (
        <TaskPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={() => {
            refetch();
            setSelectedTaskId(null);
          }}
          onDeleted={() => {
            refetch();
            setSelectedTaskId(null);
          }}
        />
      )}
    </DndContext>
  );
}
