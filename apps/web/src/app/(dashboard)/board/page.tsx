"use client";

import { LayoutGrid, Map as MapIcon } from "lucide-react";
import { BoardFilter, PageLayout, TaskCreateModal } from "@/components";
import { BoardContent, BoardHeader, SprintMindmap } from "@/components/board";
import { Button, Spinner } from "@/components/ui";
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
    setSelectedTaskId,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    roleFilter,
    setRoleFilter,
    view,
    setView,
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
          <div className="flex items-center justify-between gap-4 mb-6">
            <BoardFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              priorityFilter={priorityFilter}
              onPriorityChange={setPriorityFilter}
              roleFilter={roleFilter}
              onRoleChange={setRoleFilter}
            />

            <div className="flex items-center bg-muted/50 p-1 rounded-lg border">
              <Button
                variant={view === "board" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                onClick={() => setView("board")}
              >
                <LayoutGrid className="w-4 h-4" />
                Board
              </Button>
              <Button
                variant={view === "mindmap" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                onClick={() => setView("mindmap")}
              >
                <MapIcon className="w-4 h-4" />
                Mindmap
              </Button>
            </div>
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
          />
        ) : (
          <SprintMindmap mindmap={activeSprint?.mindmap || null} />
        )}
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
