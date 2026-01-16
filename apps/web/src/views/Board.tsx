import { TaskStatus } from "@locus/shared";
import { MoreHorizontal, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BoardFilter } from "../components/BoardFilter";
import { TaskCard } from "../components/TaskCard";
import { TaskCreateModal } from "../components/TaskCreateModal";
import { TaskPanel } from "../components/TaskPanel";
import { useTasks } from "../hooks/useTasks";

const COLUMNS = [
  TaskStatus.BACKLOG,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.VERIFICATION,
  TaskStatus.DONE,
  TaskStatus.BLOCKED,
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  [TaskStatus.BACKLOG]: { label: "Backlog", color: "var(--status-backlog)" },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    color: "var(--status-progress)",
  },
  [TaskStatus.REVIEW]: { label: "Review", color: "var(--status-review)" },
  [TaskStatus.VERIFICATION]: { label: "Verification", color: "var(--accent)" },
  [TaskStatus.DONE]: { label: "Done", color: "var(--status-done)" },
  [TaskStatus.BLOCKED]: { label: "Blocked", color: "var(--status-blocked)" },
};

export default function Board() {
  const {
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    hasActiveFilters,
    clearFilters,
    getTasksByStatus,
    updateTaskStatus,
    deleteTask,
    refreshTasks,
  } = useTasks();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalStatus, setCreateModalStatus] = useState<TaskStatus>(
    TaskStatus.BACKLOG
  );
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const handleOpenCreateModal = useCallback((status: TaskStatus) => {
    setCreateModalStatus(status);
    setIsCreateModalOpen(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleOpenCreateModal(TaskStatus.BACKLOG);
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const searchInput = document.querySelector(
          ".search-input"
        ) as HTMLInputElement;
        searchInput?.focus();
      }
      if (e.key === "Escape" && selectedTaskId) {
        setSelectedTaskId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedTaskId, handleOpenCreateModal]);

  const handleDrop = async (status: TaskStatus, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    await updateTaskStatus(Number(taskId), status);
  };

  const handleDragOver = (status: TaskStatus, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  return (
    <div className="board-container">
      <div style={{ marginBottom: "1.5rem" }}>
        <div className="board-header">
          <div>
            <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
              Development Board
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Manage tasks and track progress across the engineering pipeline.
              <span className="keyboard-hint">
                Press <kbd>N</kbd> for new task, <kbd>/</kbd> to search
              </span>
            </p>
          </div>
          <button
            className="button-primary"
            onClick={() => handleOpenCreateModal(TaskStatus.BACKLOG)}
          >
            <Plus size={18} />
            New Task
          </button>
        </div>
      </div>

      <BoardFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeChange={setAssigneeFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="board">
        {COLUMNS.map((status) => {
          const columnTasks = getTasksByStatus(status);
          const isDragOver = dragOverColumn === status;

          return (
            <div
              key={status}
              className={`column glass ${isDragOver ? "drag-over" : ""}`}
              style={{ borderTop: `4px solid ${STATUS_CONFIG[status].color}` }}
              onDrop={(e) => handleDrop(status, e)}
              onDragOver={(e) => handleDragOver(status, e)}
              onDragLeave={handleDragLeave}
            >
              <div className="column-header">
                <div className="column-title">
                  <span className="column-name">
                    {STATUS_CONFIG[status].label}
                  </span>
                  <span className="count-badge">{columnTasks.length}</span>
                </div>
                <button className="icon-button">
                  <MoreHorizontal size={14} />
                </button>
              </div>

              <div className="task-list">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTaskId(task.id)}
                    onDelete={deleteTask}
                  />
                ))}

                <button
                  className="add-task-button"
                  onClick={() => handleOpenCreateModal(status)}
                >
                  <Plus size={16} />
                  <span>Add task</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={refreshTasks}
        initialStatus={createModalStatus}
      />

      {selectedTaskId && (
        <TaskPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onDeleted={refreshTasks}
          onUpdated={refreshTasks}
        />
      )}
    </div>
  );
}
