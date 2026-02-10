"use client";

import { Suspense } from "react";
import { BoardFilter, PageLayout, TaskCreateModal } from "@/components";
import { BoardContent, BoardHeader, FlowchartView } from "@/components/board";
import { Spinner } from "@/components/ui";
import { useBoard } from "@/hooks";

function BoardPageContent() {
  const {
    activeSprint,
    filteredTasks,
    tasksByStatus,
    activeTask,
    isLoading,
    shouldShowEmptyState,
    isCreateModalOpen,
    setIsCreateModalOpen,
    setSelectedTaskId,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    roleFilter,
    setRoleFilter,
    view,
    setView,
    isCompact,
    setIsCompact,
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
    isCompact,
    onToggleCompact: () => setIsCompact(!isCompact),
    view,
    onViewChange: setView,
  });

  return (
    <>
      <PageLayout
        title={title}
        description={description}
        actions={<div id="board-header">{actions}</div>}
        contentClassName="flex flex-col"
      >
        {activeSprint != null && (
          <div id="board-filters" className="w-full mb-4 sm:mb-6">
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

        {view === "board" ? (
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
            isCompact={isCompact}
          />
        ) : view === "canvas" ? (
          <FlowchartView
            tasks={filteredTasks}
            onTaskClick={setSelectedTaskId}
            onTaskDelete={handleDeleteTask}
          />
        ) : null}
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
    </>
  );
}

export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      }
    >
      <BoardPageContent />
    </Suspense>
  );
}
