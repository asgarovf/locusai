/**
 * Board main content component
 * Renders columns, empty state, or drag overlay
 */

import {
  closestCenter,
  DndContext,
  type DndContextProps,
  DragOverlay,
} from "@dnd-kit/core";
import { type Task } from "@locusai/shared";
import { BoardColumn, BoardEmptyState } from "@/components/board";
import { BOARD_STATUSES } from "@/components/board/constants";
import { TaskCard } from "@/components/TaskCard";

interface BoardContentProps {
  filteredTasks: Task[];
  tasksByStatus: Record<string, Task[]>;
  shouldShowEmptyState: boolean;
  activeTask: Task | null;
  sensors: DndContextProps["sensors"];
  onDragStart: DndContextProps["onDragStart"];
  onDragEnd: DndContextProps["onDragEnd"];
  onTaskClick: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
  onNewTask: () => void;
}

export function BoardContent({
  filteredTasks,
  tasksByStatus,
  shouldShowEmptyState,
  activeTask,
  sensors,
  onDragStart,
  onDragEnd,
  onTaskClick,
  onTaskDelete,
  onNewTask,
}: BoardContentProps) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {shouldShowEmptyState ? (
        <div className="flex-1">
          <BoardEmptyState hasActiveSprint={false} onNewTask={onNewTask} />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex-1">
          <BoardEmptyState hasActiveSprint={true} onNewTask={onNewTask} />
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
                onTaskClick={onTaskClick}
                onTaskDelete={onTaskDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="opacity-90 rotate-2 shadow-2xl cursor-grabbing w-72">
            <TaskCard task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
