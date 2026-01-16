import { AssigneeRole, TaskPriority, TaskStatus } from "@locus/shared";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Dropdown } from "./ui/Dropdown";
import { Modal } from "./ui/Modal";

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialStatus?: TaskStatus;
}

const STATUS_OPTIONS = Object.values(TaskStatus).map((status) => ({
  value: status,
  label: status.replace(/_/g, " "),
  color: getStatusColor(status),
}));

const PRIORITY_OPTIONS = [
  { value: TaskPriority.LOW, label: "Low", color: "var(--text-muted)" },
  { value: TaskPriority.MEDIUM, label: "Medium", color: "#38bdf8" },
  { value: TaskPriority.HIGH, label: "High", color: "#f59e0b" },
  { value: TaskPriority.CRITICAL, label: "Critical", color: "#ef4444" },
];

const ASSIGNEE_OPTIONS = Object.values(AssigneeRole).map((role) => ({
  value: role,
  label: role.charAt(0) + role.slice(1).toLowerCase(),
}));

function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    [TaskStatus.BACKLOG]: "#64748b",
    [TaskStatus.IN_PROGRESS]: "#f59e0b",
    [TaskStatus.REVIEW]: "#a855f7",
    [TaskStatus.VERIFICATION]: "#38bdf8",
    [TaskStatus.DONE]: "#10b981",
    [TaskStatus.BLOCKED]: "#ef4444",
  };
  return colors[status];
}

export function TaskCreateModal({
  isOpen,
  onClose,
  onCreated,
  initialStatus = TaskStatus.BACKLOG,
}: TaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [assigneeRole, setAssigneeRole] = useState<AssigneeRole | undefined>();
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus(initialStatus);
    setPriority(TaskPriority.MEDIUM);
    setAssigneeRole(undefined);
    setLabels([]);
    setLabelInput("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddLabel = () => {
    const trimmedLabel = labelInput.trim();
    if (trimmedLabel && !labels.includes(trimmedLabel)) {
      setLabels([...labels, trimmedLabel]);
      setLabelInput("");
    }
  };

  const handleRemoveLabel = (label: string) => {
    setLabels(labels.filter((l) => l !== label));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description,
          status,
          priority,
          labels,
          assigneeRole,
        }),
      });

      if (res.ok) {
        handleClose();
        onCreated();
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Task" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="form-input"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more details about this task..."
            className="form-textarea"
            rows={4}
          />
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <Dropdown
              label="Status"
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <Dropdown
              label="Priority"
              value={priority}
              onChange={setPriority}
              options={PRIORITY_OPTIONS}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <Dropdown
              label="Assignee"
              value={assigneeRole}
              onChange={setAssigneeRole}
              options={ASSIGNEE_OPTIONS}
              placeholder="Unassigned"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Labels</label>
          <div className="labels-container">
            {labels.map((label) => (
              <span key={label} className="label-tag">
                {label}
                <button
                  type="button"
                  onClick={() => handleRemoveLabel(label)}
                  className="label-remove"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="label-input-row">
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddLabel();
                }
              }}
              placeholder="Type label and press Enter"
              className="form-input"
            />
            <button
              type="button"
              onClick={handleAddLabel}
              className="button-secondary"
              disabled={!labelInput.trim()}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleClose}
            className="button-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>

      <style>{`
        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: var(--glass-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-main);
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .form-textarea {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: var(--glass-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-main);
          font-size: 0.875rem;
          resize: vertical;
          font-family: inherit;
          min-height: 100px;
          transition: border-color 0.2s;
        }

        .form-textarea:focus {
          outline: none;
          border-color: var(--accent);
        }

        .form-row {
          display: flex;
          gap: 1rem;
        }

        .labels-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          min-height: 24px;
        }

        .label-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(56, 189, 248, 0.15);
          color: var(--accent);
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .label-remove {
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          opacity: 0.7;
          transition: opacity 0.15s;
        }

        .label-remove:hover {
          opacity: 1;
        }

        .label-input-row {
          display: flex;
          gap: 0.5rem;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </Modal>
  );
}
