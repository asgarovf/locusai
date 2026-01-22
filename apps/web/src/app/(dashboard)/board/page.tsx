"use client";

import { closestCenter, DndContext, DragOverlay } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { BoardFilter } from "@/components/BoardFilter";
import { BoardColumn } from "@/components/board/BoardColumn";
import { BoardEmptyState } from "@/components/board/BoardEmptyState";
import { BOARD_STATUSES } from "@/components/board/constants";
import { PageLayout } from "@/components/PageLayout";
import { TaskCard } from "@/components/TaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { TaskPanel } from "@/components/TaskPanel";
import { Button, Spinner } from "@/components/ui";
import { useBoard } from "@/hooks/useBoard";

export default function BoardPage() {
  const {
    activeSprint,
    filteredTasks,
    tasksByStatus,
    activeTask,
    isLoading,
    shouldShowEmptyState,
    isCreateModalOpen,
    setIsCreateModalOpen,
    selectedTaskId,
    setSelectedTaskId,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    roleFilter,
    setRoleFilter,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDeleteTask,
    refetch,
  } = useBoard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const headerActions = (
    <Button
      onClick={() => setIsCreateModalOpen(true)}
      size="md"
      className="shadow-lg shadow-primary/20"
    >
      <Plus size={18} className="mr-2" />
      New Task
    </Button>
  );

  const headerDescription = (
    <div className="flex items-center gap-2">
      {activeSprint ? (
        <>
          <span className="text-primary font-bold">{activeSprint.name}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span>{filteredTasks.length} tasks</span>
        </>
      ) : (
        <span>No active sprint</span>
      )}
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <PageLayout
        title="Board"
        description={headerDescription}
        actions={headerActions}
        contentClassName="flex flex-col"
      >
        {activeSprint != null && (
          <div className="flex-none mb-6">
            <BoardFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              priorityFilter={priorityFilter}
              onPriorityChange={setPriorityFilter}
              roleFilter={roleFilter}
              onRoleChange={setRoleFilter}
            />
          </div>
        )}

        {shouldShowEmptyState ? (
          <div className="flex-1">
            <BoardEmptyState
              hasActiveSprint={false}
              onNewTask={() => setIsCreateModalOpen(true)}
            />
          </div>
        ) : filteredTasks.length === 0 && !activeTask ? (
          <div className="flex-1">
            <BoardEmptyState
              hasActiveSprint={true}
              onNewTask={() => setIsCreateModalOpen(true)}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto min-h-0">
            <div className="flex gap-4 h-full min-w-max pb-4">
              {BOARD_STATUSES.map((status) => (
                <BoardColumn
                  key={status.key}
                  statusKey={status.key}
                  title={status.label}
                  tasks={tasksByStatus[status.key] || []}
                  onTaskClick={setSelectedTaskId}
                  onTaskDelete={handleDeleteTask}
                />
              ))}
            </div>
          </div>
        )}
      </PageLayout>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="opacity-90 rotate-2 shadow-2xl cursor-grabbing w-72">
            <TaskCard task={activeTask} />
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
