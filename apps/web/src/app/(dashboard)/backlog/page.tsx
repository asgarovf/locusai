"use client";

import { closestCenter, DndContext, DragOverlay } from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";
import { Layers, Plus } from "lucide-react";
import { BacklogList } from "@/components/backlog/BacklogList";
import { CompletedSprintsSection } from "@/components/backlog/CompletedSprintsSection";
import { SprintSection } from "@/components/backlog/SprintSection";
import { PageLayout } from "@/components/PageLayout";
import { SprintCreateModal } from "@/components/SprintCreateModal";
import { TaskCard } from "@/components/TaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { TaskPanel } from "@/components/TaskPanel";
import { Button, Spinner } from "@/components/ui";
import { useBacklog } from "@/hooks/useBacklog";

export default function BacklogPage() {
  const {
    tasks,
    sprints,
    backlogTasks,
    activeSprint,
    plannedSprints,
    completedSprints,
    getSprintTasks,
    isLoading,
    isTaskModalOpen,
    setIsTaskModalOpen,
    isSprintModalOpen,
    setIsSprintModalOpen,
    selectedTaskId,
    setSelectedTaskId,
    activeTask,
    expandedSections,
    isSubmitting,
    sensors,
    toggleSection,
    handleDragStart,
    handleDragEnd,
    handleCreateSprint,
    handleStartSprint,
    handleCompleteSprint,
    handleDeleteTask,
    refetchTasks,
  } = useBacklog();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={() => setIsSprintModalOpen(true)}
        className="h-9 border-border/50"
      >
        <Layers size={16} className="mr-2" />
        New Sprint
      </Button>
      <Button
        onClick={() => setIsTaskModalOpen(true)}
        className="h-9 shadow-lg shadow-primary/20"
      >
        <Plus size={16} className="mr-2" />
        New Task
      </Button>
    </div>
  );

  const headerStats = (
    <div className="flex items-center gap-2">
      <span className="text-primary font-bold">{tasks.length} tasks</span>
      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
      <span>{sprints.length} sprints</span>
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
        title="Backlog"
        description={headerStats}
        actions={headerActions}
      >
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {/* 1. Active Sprint */}
            {activeSprint && (
              <SprintSection
                key={`section-active-${activeSprint.id}`}
                sprint={activeSprint}
                tasks={getSprintTasks(activeSprint.id)}
                isExpanded={expandedSections.has("active")}
                onToggle={() => toggleSection("active")}
                isActive={true}
                onComplete={handleCompleteSprint}
                onTaskClick={setSelectedTaskId}
                onTaskDelete={handleDeleteTask}
                isSubmitting={isSubmitting}
              />
            )}

            {/* 2. Planned Sprints */}
            {plannedSprints.map((sprint) => (
              <SprintSection
                key={`section-planned-${sprint.id}`}
                sprint={sprint}
                tasks={getSprintTasks(sprint.id)}
                isExpanded={expandedSections.has(`planned-${sprint.id}`)}
                onToggle={() => toggleSection(`planned-${sprint.id}`)}
                canStart={!activeSprint}
                onStart={handleStartSprint}
                onTaskClick={setSelectedTaskId}
                onTaskDelete={handleDeleteTask}
                isSubmitting={isSubmitting}
              />
            ))}

            {/* 3. Backlog Section */}
            <BacklogList
              key="backlog-list"
              tasks={backlogTasks}
              isExpanded={expandedSections.has("backlog")}
              onToggle={() => toggleSection("backlog")}
              onTaskClick={setSelectedTaskId}
              onTaskDelete={handleDeleteTask}
            />

            {/* 4. Completed Sprints */}
            <CompletedSprintsSection
              key="completed-sprints"
              sprints={completedSprints}
              isExpanded={expandedSections.has("completed")}
              onToggle={() => toggleSection("completed")}
              getSprintTasks={getSprintTasks}
              expandedSprints={expandedSections}
              onToggleSprint={toggleSection}
              onTaskClick={setSelectedTaskId}
            />
          </AnimatePresence>
        </div>
      </PageLayout>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="opacity-80 rotate-1 shadow-2xl cursor-grabbing scale-105 transition-transform duration-200">
            <TaskCard task={activeTask} variant="list" />
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
