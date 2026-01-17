"use client";

import { AssigneeRole, TaskPriority, TaskStatus } from "@locusai/shared";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button, Dropdown, Input, Modal, Textarea } from "@/components/ui";
import { taskService } from "@/services";

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialStatus?: TaskStatus;
  sprintId?: number | null;
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
  sprintId = null,
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
      await taskService.create({
        title: title.trim(),
        description,
        status,
        priority,
        labels,
        assigneeRole,
        sprintId,
      });

      handleClose();
      onCreated();
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Task"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-8 py-2">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Task Title <span className="text-destructive">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement authentication flow"
            autoFocus
            className="text-lg font-medium h-12"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context for this task..."
            rows={5}
            className="resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Dropdown
            label="Initial Status"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
          />
          <Dropdown
            label="Priority Level"
            value={priority}
            onChange={setPriority}
            options={PRIORITY_OPTIONS}
          />
          <Dropdown
            label="Primary Assignee"
            value={assigneeRole}
            onChange={setAssigneeRole}
            options={ASSIGNEE_OPTIONS}
            placeholder="Unassigned"
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Task Labels
          </label>
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {labels.length === 0 && (
              <span className="text-xs text-muted-foreground/50 italic py-1">
                No labels added...
              </span>
            )}
            {labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-[11px] font-semibold border shadow-sm transition-all hover:bg-secondary/80 translate-y-0 hover:-translate-y-0.5"
              >
                {label}
                <button
                  type="button"
                  onClick={() => handleRemoveLabel(label)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-3">
            <Input
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddLabel();
                }
              }}
              placeholder="Add labels (e.g. Bug, Feature)..."
              className="flex-1 h-10"
            />
            <Button
              type="button"
              onClick={handleAddLabel}
              variant="secondary"
              size="icon"
              disabled={!labelInput.trim()}
              className="h-10 w-10 shrink-0"
            >
              <Plus size={18} />
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-4">
          <Button
            type="button"
            onClick={handleClose}
            variant="ghost"
            className="px-6"
          >
            Discard
          </Button>
          <Button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="px-8 shadow-lg shadow-primary/10"
          >
            {isSubmitting ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
