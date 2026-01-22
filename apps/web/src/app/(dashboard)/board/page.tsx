"use client";

import {
  BoardFilter,
  PageLayout,
  TaskCreateModal,
  TaskPanel,
} from "@/components";
import { BoardContent, BoardHeader } from "@/components/board";
import { Spinner } from "@/components/ui";
import { useBoard } from "@/hooks";

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

  const { title, description, actions } = BoardHeader({
    activeSprint,
    filteredTasksCount: filteredTasks.length,
    onNewTask: () => setIsCreateModalOpen(true),
  });

  return (
    <>
      <PageLayout
        title={title}
        description={description}
        actions={actions}
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

        <BoardContent
          filteredTasks={filteredTasks}
          tasksByStatus={tasksByStatus}
          shouldShowEmptyState={shouldShowEmptyState}
          activeTask={activeTask}
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onTaskClick={setSelectedTaskId}
          onTaskDelete={handleDeleteTask}
          onNewTask={() => setIsCreateModalOpen(true)}
        />
      </PageLayout>

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
    </>
  );
}
