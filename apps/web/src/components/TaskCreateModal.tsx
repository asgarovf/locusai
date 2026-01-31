/**
 * Task Create Modal Component
 *
 * Modal dialog for creating new tasks with full configuration.
 * Includes title, description, priority, status, assignee, and sprint selection.
 *
 * @example
 * <TaskCreateModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onCreated={handleCreated}
 *   initialStatus={TaskStatus.BACKLOG}
 *   defaultSprintId={sprintId}
 * />
 */

"use client";

import { AssigneeRole, TaskPriority, TaskStatus } from "@locusai/shared";
import { HelpCircle, Plus, X } from "lucide-react";
import { useState } from "react";
import { CreateModal } from "@/components/CreateModal";
import { Editor } from "@/components/Editor";
import { Button, Dropdown, Input, Tooltip } from "@/components/ui";
import { useWorkspaceId } from "@/hooks";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { locusClient } from "@/lib/api-client";
import {
  getAssigneeOptions,
  getPriorityOptions,
  getStatusOptions,
} from "@/lib/options";
import { queryKeys } from "@/lib/query-keys";
import { TASK_TEMPLATES, TaskTemplate } from "@/lib/task-templates";

interface TaskCreateModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Called to close modal */
  onClose: () => void;
  /** Called after successful creation */
  onCreated: () => void;
  /** Initial task status */
  initialStatus?: TaskStatus;
  /** Sprint ID if creating from sprint */
  sprintId?: string | null;
  /** Default sprint ID to assign */
  defaultSprintId?: string;
}

export function TaskCreateModal({
  isOpen,
  onClose,
  onCreated,
  initialStatus = TaskStatus.BACKLOG,
  sprintId = null,
  defaultSprintId = undefined,
}: TaskCreateModalProps) {
  const workspaceId = useWorkspaceId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [assigneeRole, setAssigneeRole] = useState<AssigneeRole | undefined>();
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  const applyTemplate = (templateKey: TaskTemplate) => {
    const templateData = TASK_TEMPLATES[templateKey];
    setDescription(templateData.description);
    setPriority(templateData.priority as TaskPriority);
    setStatus(templateData.status as TaskStatus);
    setSelectedTemplate(templateKey);
  };

  const createTaskMutation = useMutationWithToast({
    mutationFn: (data: Parameters<typeof locusClient.tasks.create>[1]) =>
      locusClient.tasks.create(workspaceId, data),
    successMessage: "Task created successfully",
    invalidateKeys: [queryKeys.tasks.all()],
    onSuccess: () => {
      resetForm();
      onClose();
      onCreated();
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus(initialStatus);
    setPriority(TaskPriority.MEDIUM);
    setAssigneeRole(undefined);
    setLabels([]);
    setLabelInput("");
    setSelectedTemplate(null);
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

    createTaskMutation.mutate({
      title: title.trim(),
      description,
      status,
      priority,
      labels,
      assigneeRole,
      sprintId: defaultSprintId || sprintId || undefined,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const labelFieldComponent = (
    <div className="space-y-4">
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
  );

  const dropdownsFieldComponent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium">Initial Status</label>
          <Tooltip content="Starting state for the new task">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </Tooltip>
        </div>
        <Dropdown<TaskStatus>
          value={status}
          onChange={setStatus}
          options={getStatusOptions()}
        />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium">Priority Level</label>
          <Tooltip content="Urgency level for task completion">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </Tooltip>
        </div>
        <Dropdown<TaskPriority>
          value={priority}
          onChange={setPriority}
          options={getPriorityOptions()}
        />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium">Primary Assignee</label>
          <Tooltip content="Team member role responsible for this task">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </Tooltip>
        </div>
        <Dropdown<AssigneeRole>
          value={assigneeRole}
          onChange={setAssigneeRole}
          options={getAssigneeOptions()}
          placeholder="Unassigned"
        />
      </div>
    </div>
  );

  const templateSelectorComponent = (
    <div className="flex gap-2 flex-wrap">
      {(Object.keys(TASK_TEMPLATES) as TaskTemplate[]).map((key) => (
        <Button
          key={key}
          type="button"
          onClick={() => applyTemplate(key)}
          variant={selectedTemplate === key ? "primary" : "outline"}
          size="sm"
          className="text-xs"
        >
          {key.charAt(0).toUpperCase() + key.slice(1)}
        </Button>
      ))}
    </div>
  );


  // Define all fields
  const allFields = [
    {
      name: "templates",
      label: "Templates",
      component: templateSelectorComponent,
    },
    {
      name: "title",
      label: "Task Title",
      component: (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Implement authentication flow"
          autoFocus
          className="text-lg font-medium h-12"
        />
      ),
      required: true,
    },
    {
      name: "description",
      label: "Description",
      component: (
        <div className="border border-border/40 rounded-2xl overflow-hidden bg-secondary/5">
          <Editor
            value={description}
            onChange={setDescription}
            readOnly={false}
            placeholder="Define implementation architecture, requirements, and scope..."
          />
        </div>
      ),
    },
    {
      name: "properties",
      label: "Task Properties",
      component: dropdownsFieldComponent,
    },
    {
      name: "labels",
      label: (
        <div className="flex items-center gap-2">
          <span>Task Labels</span>
          <Tooltip content="Tags for categorizing and filtering tasks">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </Tooltip>
        </div>
      ),
      component: labelFieldComponent,
    },
  ];

  return (
    <CreateModal
      isOpen={isOpen}
      title="Create New Task"
      size="responsive"
      shortcutHint="Alt+N"
      fields={allFields}
      onSubmit={handleSubmit}
      onClose={handleClose}
      submitText="Create Task"
      isPending={createTaskMutation.isPending}
      submitDisabled={!title.trim()}
    />
  );
}
