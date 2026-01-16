import { type Task, TaskPriority } from "@locus/shared";
import { Calendar, Lock, MoreHorizontal, Tag, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDelete: (id: number) => void;
  isDragging?: boolean;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: "var(--text-muted)",
  [TaskPriority.MEDIUM]: "#38bdf8",
  [TaskPriority.HIGH]: "#f59e0b",
  [TaskPriority.CRITICAL]: "#ef4444",
};

export function TaskCard({
  task,
  onClick,
  onDelete,
  isDragging,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLocked =
    task.lockedBy && (!task.lockExpiresAt || task.lockExpiresAt > Date.now());
  const priority = (task.priority as TaskPriority) || TaskPriority.MEDIUM;

  return (
    <div
      className={`task-card card ${isDragging ? "dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", String(task.id));
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="task-card-content" onClick={onClick}>
        <div className="task-card-header">
          <div className="task-card-indicators">
            <span
              className="priority-dot"
              style={{ background: PRIORITY_COLORS[priority] }}
              title={`Priority: ${priority}`}
            />
            {isLocked && (
              <span title={`Locked by ${task.lockedBy}`}>
                <Lock size={12} className="lock-icon" />
              </span>
            )}
          </div>
          <h4>{task.title}</h4>
        </div>

        {task.labels.length > 0 && (
          <div className="labels">
            {task.labels.slice(0, 3).map((l) => (
              <span key={l} className="label">
                <Tag size={10} /> {l}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="label more">+{task.labels.length - 3}</span>
            )}
          </div>
        )}

        <div className="task-card-footer">
          <div className="task-date">
            <Calendar size={12} />
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
          {task.assigneeRole && (
            <div className="assignee-avatar">
              {task.assigneeRole.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="task-card-menu" ref={menuRef}>
        <button
          className="menu-trigger"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <MoreHorizontal size={14} />
        </button>

        {showMenu && (
          <div className="menu-dropdown glass">
            <button
              className="menu-item danger"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this task?")) {
                  onDelete(task.id);
                }
                setShowMenu(false);
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>

      <style>{`
        .task-card {
          position: relative;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .task-card.dragging {
          opacity: 0.5;
          transform: rotate(2deg);
        }

        .task-card-content {
          padding: 1rem;
        }

        .task-card-header {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .task-card-indicators {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding-top: 4px;
        }

        .priority-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .lock-icon {
          color: var(--text-muted);
        }

        .task-card h4 {
          font-size: 0.9375rem;
          line-height: 1.4;
          color: var(--text-main);
          flex: 1;
          margin: 0;
        }

        .labels {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .label {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          background: rgba(56, 189, 248, 0.1);
          color: var(--accent);
          padding: 2px 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .label.more {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
        }

        .task-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
        }

        .task-date {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        .assignee-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--accent);
          color: #000;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .task-card-menu {
          position: absolute;
          top: 8px;
          right: 8px;
        }

        .menu-trigger {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          opacity: 0;
          transition: all 0.15s;
        }

        .task-card:hover .menu-trigger {
          opacity: 1;
        }

        .menu-trigger:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
        }

        .menu-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: var(--sidebar-bg);
          border-radius: 8px;
          padding: 4px;
          min-width: 120px;
          z-index: 50;
          animation: menuFadeIn 0.15s ease-out;
        }

        @keyframes menuFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-main);
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.15s;
        }

        .menu-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .menu-item.danger {
          color: #ef4444;
        }

        .menu-item.danger:hover {
          background: rgba(239, 68, 68, 0.1);
        }
      `}</style>
    </div>
  );
}
