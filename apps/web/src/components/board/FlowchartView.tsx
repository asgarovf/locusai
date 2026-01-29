"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { Task } from "@locusai/shared";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { TaskCard } from "@/components/TaskCard";
import { SortableTaskNode } from "./SortableTaskNode";

interface FlowchartViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
}

export function FlowchartView({
  tasks,
  onTaskClick,
  onTaskDelete,
}: FlowchartViewProps) {
  // Local state for reordering
  const [items, setItems] = useState<Task[]>(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    // Sync with props, but respect local sorting if we had persistence (for now just reset)
    // In a real app, 'tasks' would come sorted from the backend
    setItems((prev) => {
      // If length changed, likely a fresh load or filter change, so strict sync
      if (prev.length !== tasks.length) return tasks;
      // Otherwise try to keep local order but update content
      // (Simplification: just syncing with props for now to avoid complexity without backend persistence)
      return tasks;
    });
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const activeTask = items.find((t) => t.id === activeId);

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden bg-stone-50/50 dark:bg-zinc-950 min-h-0 relative">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="h-full flex items-center px-12 min-w-max gap-4 relative z-10">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-96 h-64 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10 mx-auto">
                <p className="text-lg font-medium">No tasks in this view</p>
              </div>
            ) : (
              items.map((task, index) => (
                <div key={task.id} className="flex items-center">
                  <SortableTaskNode
                    task={task}
                    onTaskClick={onTaskClick}
                    onTaskDelete={onTaskDelete}
                  />
                  {index < items.length - 1 && (
                    <div className="px-4 text-muted-foreground/30">
                      <ArrowRight size={24} />
                    </div>
                  )}
                </div>
              ))
            )}
          </SortableContext>

          <DragOverlay>
            {activeTask ? (
              <div className="w-72 rotate-2 cursor-grabbing shadow-2xl">
                <TaskCard
                  task={activeTask}
                  variant="card"
                  onClick={() => {
                    /* No-op during drag */
                  }}
                  onDelete={() => {
                    /* No-op during drag */
                  }}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
