import {
  type AcceptanceItem,
  type Artifact,
  AssigneeRole,
  type Event,
  type Task,
  TaskPriority,
  TaskStatus,
} from "@locus/shared";
import {
  Check,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  MessageSquare,
  Plus,
  Terminal,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PriorityBadge, StatusBadge } from "./ui/Badge";
import { Checkbox } from "./ui/Checkbox";
import { Dropdown } from "./ui/Dropdown";

interface TaskPanelProps {
  taskId: number;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS = Object.values(TaskStatus).map((status) => ({
  value: status,
  label: status.replace(/_/g, " "),
}));

const PRIORITY_OPTIONS = [
  { value: TaskPriority.LOW, label: "Low" },
  { value: TaskPriority.MEDIUM, label: "Medium" },
  { value: TaskPriority.HIGH, label: "High" },
  { value: TaskPriority.CRITICAL, label: "Critical" },
];

const ASSIGNEE_OPTIONS = Object.values(AssigneeRole).map((role) => ({
  value: role,
  label: role.charAt(0) + role.slice(1).toLowerCase(),
}));

export function TaskPanel({
  taskId,
  onClose,
  onDeleted,
  onUpdated,
}: TaskPanelProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [activeTab, setActiveTab] = useState<"activity" | "artifacts">(
    "activity"
  );

  const fetchTask = useCallback(() => {
    Promise.all([
      fetch(`/api/tasks/${taskId}`).then((res) => res.json()),
      fetch(`/api/events?taskId=${taskId}`).then((res) => res.json()),
      fetch(`/api/tasks/${taskId}/artifacts`).then((res) => res.json()),
    ]).then(([taskData, eventsData, artifactsData]) => {
      setTask(taskData);
      setEvents(eventsData);
      setArtifacts(artifactsData);
      setEditTitle(taskData.title);
      setEditDesc(taskData.description || "");
    });
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const updateTask = async (updates: Partial<Task>) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    fetchTask();
    onUpdated();
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this task? This action cannot be undone."
      )
    ) {
      return;
    }
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    onDeleted();
    onClose();
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle !== task?.title) {
      updateTask({ title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescSave = () => {
    if (editDesc !== task?.description) {
      updateTask({ description: editDesc });
    }
    setIsEditingDesc(false);
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim() || !task) return;
    const newItem: AcceptanceItem = {
      id: crypto.randomUUID(),
      text: newChecklistItem.trim(),
      done: false,
    };
    updateTask({
      acceptanceChecklist: [...task.acceptanceChecklist, newItem] as never,
    });
    setNewChecklistItem("");
  };

  const handleToggleChecklistItem = (itemId: string) => {
    if (!task) return;
    const updated = task.acceptanceChecklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    updateTask({ acceptanceChecklist: updated as never });
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    if (!task) return;
    const updated = task.acceptanceChecklist.filter(
      (item) => item.id !== itemId
    );
    updateTask({ acceptanceChecklist: updated as never });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await fetch(`/api/tasks/${taskId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: "Human", text: newComment }),
    });
    setNewComment("");
    fetchTask();
  };

  const handleRunCi = async (preset: string) => {
    const res = await fetch("/api/ci/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, preset }),
    });
    const data = await res.json();
    alert(data.summary);
    fetchTask();
  };

  const handleLock = async () => {
    await fetch(`/api/tasks/${taskId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "human", ttlSeconds: 3600 }),
    });
    fetchTask();
    onUpdated();
  };

  const handleUnlock = async () => {
    await fetch(`/api/tasks/${taskId}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "human" }),
    });
    fetchTask();
    onUpdated();
  };

  if (!task) {
    return (
      <div className="task-panel glass">
        <div className="panel-loading">Loading...</div>
      </div>
    );
  }

  const isLocked =
    task.lockedBy && (!task.lockExpiresAt || task.lockExpiresAt > Date.now());
  const checklistProgress = task.acceptanceChecklist.length
    ? Math.round(
        (task.acceptanceChecklist.filter((i) => i.done).length /
          task.acceptanceChecklist.length) *
          100
      )
    : 0;

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="task-panel glass">
        <div className="panel-header">
          <button className="panel-close" onClick={onClose}>
            <ChevronRight size={20} />
          </button>
          <div className="panel-badges">
            <StatusBadge status={task.status} />
            <PriorityBadge
              priority={(task.priority as TaskPriority) || TaskPriority.MEDIUM}
            />
          </div>
          <div className="panel-actions">
            {isLocked ? (
              <button
                className="icon-btn"
                onClick={handleUnlock}
                title="Unlock"
              >
                <Unlock size={16} />
              </button>
            ) : (
              <button className="icon-btn" onClick={handleLock} title="Lock">
                <Lock size={16} />
              </button>
            )}
            <button
              className="icon-btn danger"
              onClick={handleDelete}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="panel-body">
          <div className="panel-main">
            {/* Title */}
            {isEditingTitle ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setEditTitle(task.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="title-input"
                autoFocus
              />
            ) : (
              <h2
                className="task-title"
                onClick={() => setIsEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}

            {/* Description */}
            <div className="section">
              <h4>Description</h4>
              {isEditingDesc ? (
                <div>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="desc-textarea"
                    rows={4}
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button
                      className="button-primary btn-sm"
                      onClick={handleDescSave}
                    >
                      Save
                    </button>
                    <button
                      className="button-secondary btn-sm"
                      onClick={() => {
                        setEditDesc(task.description || "");
                        setIsEditingDesc(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="task-desc"
                  onClick={() => setIsEditingDesc(true)}
                  style={{ cursor: "pointer" }}
                >
                  {task.description || "Click to add description..."}
                </p>
              )}
            </div>

            {/* Acceptance Checklist */}
            <div className="section">
              <div className="section-header">
                <h4>
                  Acceptance Criteria
                  {task.acceptanceChecklist.length > 0 && (
                    <span className="progress-text">{checklistProgress}%</span>
                  )}
                </h4>
              </div>
              {task.acceptanceChecklist.length > 0 && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
              )}
              <div className="checklist">
                {task.acceptanceChecklist.map((item) => (
                  <div key={item.id} className="checklist-item">
                    <Checkbox
                      checked={item.done}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      label={item.text}
                    />
                    <button
                      className="remove-item"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="add-item-row">
                <input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddChecklistItem();
                  }}
                  placeholder="Add acceptance criteria..."
                  className="add-item-input"
                />
                <button
                  className="button-secondary btn-sm"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistItem.trim()}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* CI Actions */}
            <div className="section">
              <h4>Quality Checks</h4>
              <div className="ci-buttons">
                <button
                  className="button-secondary"
                  onClick={() => handleRunCi("quick")}
                >
                  <Terminal size={14} />
                  Quick Check
                </button>
                <button
                  className="button-secondary"
                  onClick={() => handleRunCi("full")}
                >
                  <Check size={14} />
                  Full Check
                </button>
              </div>
            </div>
          </div>

          <div className="panel-sidebar">
            {/* Properties */}
            <div className="section">
              <h4>Properties</h4>
              <div className="properties">
                <Dropdown
                  label="Status"
                  value={task.status}
                  onChange={(status) => updateTask({ status })}
                  options={STATUS_OPTIONS}
                />
                <Dropdown
                  label="Priority"
                  value={(task.priority as TaskPriority) || TaskPriority.MEDIUM}
                  onChange={(priority) => updateTask({ priority } as never)}
                  options={PRIORITY_OPTIONS}
                />
                <Dropdown
                  label="Assignee"
                  value={task.assigneeRole}
                  onChange={(assigneeRole) => updateTask({ assigneeRole })}
                  options={ASSIGNEE_OPTIONS}
                  placeholder="Unassigned"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button
                className={`tab ${activeTab === "activity" ? "active" : ""}`}
                onClick={() => setActiveTab("activity")}
              >
                <MessageSquare size={14} />
                Activity
              </button>
              <button
                className={`tab ${activeTab === "artifacts" ? "active" : ""}`}
                onClick={() => setActiveTab("artifacts")}
              >
                <FileText size={14} />
                Artifacts ({artifacts.length})
              </button>
            </div>

            {activeTab === "activity" ? (
              <div className="section">
                <div className="comment-input-row">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddComment();
                    }}
                    placeholder="Add a comment..."
                    className="comment-input"
                  />
                  <button
                    className="button-primary btn-sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    Send
                  </button>
                </div>
                <div className="activity-feed">
                  {events.map((event) => (
                    <div key={event.id} className="activity-item">
                      <div className="activity-icon">
                        {event.type === "COMMENT_ADDED" ? (
                          <MessageSquare size={12} />
                        ) : event.type === "STATUS_CHANGED" ? (
                          <ChevronRight size={12} />
                        ) : (
                          <Clock size={12} />
                        )}
                      </div>
                      <div className="activity-content">
                        <span className="activity-type">
                          {formatEventType(event.type)}
                        </span>
                        <span className="activity-time">
                          {new Date(event.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="section">
                <div className="artifacts-list">
                  {artifacts.map((artifact) => (
                    <div key={artifact.id} className="artifact-item">
                      <div className="artifact-icon">
                        {artifact.type === "CI_OUTPUT" ? (
                          <Terminal size={14} />
                        ) : (
                          <FileText size={14} />
                        )}
                      </div>
                      <div className="artifact-info">
                        <span className="artifact-title">{artifact.title}</span>
                        <span className="artifact-meta">
                          {artifact.type} •{" "}
                          {new Date(artifact.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {artifacts.length === 0 && (
                    <p className="empty-state">No artifacts yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 900;
          animation: fadeIn 0.2s ease-out;
        }

        .task-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 900px;
          max-width: 90vw;
          background: var(--sidebar-bg);
          z-index: 950;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.25s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .panel-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }

        .panel-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .panel-close:hover {
          color: var(--text-main);
        }

        .panel-badges {
          display: flex;
          gap: 0.5rem;
          flex: 1;
        }

        .panel-actions {
          display: flex;
          gap: 0.5rem;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          transition: all 0.15s;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
        }

        .icon-btn.danger:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .panel-body {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 320px;
          overflow: hidden;
        }

        .panel-main {
          padding: 1.5rem;
          overflow-y: auto;
        }

        .panel-sidebar {
          padding: 1.5rem;
          border-left: 1px solid var(--border);
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.1);
        }

        .task-title {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .task-title:hover {
          opacity: 0.8;
        }

        .title-input {
          width: 100%;
          font-size: 1.5rem;
          font-family: "Outfit", sans-serif;
          font-weight: 600;
          background: transparent;
          border: none;
          border-bottom: 2px solid var(--accent);
          color: var(--text-main);
          padding: 0;
          margin-bottom: 1.5rem;
          outline: none;
        }

        .section {
          margin-bottom: 1.5rem;
        }

        .section h4 {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .progress-text {
          font-size: 0.625rem;
          padding: 2px 6px;
          background: var(--accent);
          color: #000;
          border-radius: 4px;
          font-weight: 700;
        }

        .progress-bar {
          height: 4px;
          background: var(--border);
          border-radius: 2px;
          margin-bottom: 1rem;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--accent);
          transition: width 0.3s ease;
        }

        .task-desc {
          color: var(--text-main);
          line-height: 1.6;
          font-size: 0.9375rem;
          opacity: 0.9;
        }

        .desc-textarea {
          width: 100%;
          padding: 0.75rem;
          background: var(--glass-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-main);
          font-size: 0.9375rem;
          font-family: inherit;
          resize: vertical;
          min-height: 100px;
        }

        .desc-textarea:focus {
          outline: none;
          border-color: var(--accent);
        }

        .edit-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.8125rem;
        }

        .checklist {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem;
          background: var(--glass-bg);
          border-radius: 6px;
        }

        .remove-item {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          opacity: 0;
          transition: all 0.15s;
        }

        .checklist-item:hover .remove-item {
          opacity: 1;
        }

        .remove-item:hover {
          color: #ef4444;
        }

        .add-item-row {
          display: flex;
          gap: 0.5rem;
        }

        .add-item-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          background: var(--glass-bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-main);
          font-size: 0.875rem;
        }

        .add-item-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .ci-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .ci-buttons button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .properties {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-muted);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .tab:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.03);
        }

        .tab.active {
          color: var(--accent);
          background: rgba(56, 189, 248, 0.1);
        }

        .comment-input-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .comment-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          background: var(--glass-bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-main);
          font-size: 0.875rem;
        }

        .comment-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 300px;
          overflow-y: auto;
        }

        .activity-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.5rem;
          background: var(--glass-bg);
          border-radius: 6px;
        }

        .activity-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .activity-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .activity-type {
          font-size: 0.8125rem;
          color: var(--text-main);
        }

        .activity-time {
          font-size: 0.6875rem;
          color: var(--text-muted);
        }

        .artifacts-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .artifact-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--glass-bg);
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .artifact-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .artifact-icon {
          color: var(--accent);
        }

        .artifact-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .artifact-title {
          font-size: 0.875rem;
          color: var(--text-main);
        }

        .artifact-meta {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .empty-state {
          color: var(--text-muted);
          font-size: 0.875rem;
          text-align: center;
          padding: 2rem;
        }
      `}</style>
    </>
  );
}

function formatEventType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
