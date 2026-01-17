"use client";

import { AssigneeRole, TaskPriority } from "@locusai/shared";
import { Search, X } from "lucide-react";
import { Button, Dropdown, Input } from "@/components/ui";

interface BoardFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilter: TaskPriority | "ALL";
  onPriorityChange: (priority: TaskPriority | "ALL") => void;
  assigneeFilter: AssigneeRole | "ALL";
  onAssigneeChange: (assignee: AssigneeRole | "ALL") => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const PRIORITY_FILTER_OPTIONS = [
  { value: "ALL" as const, label: "All Priorities" },
  { value: TaskPriority.LOW, label: "Low" },
  { value: TaskPriority.MEDIUM, label: "Medium" },
  { value: TaskPriority.HIGH, label: "High" },
  { value: TaskPriority.CRITICAL, label: "Critical" },
];

const ASSIGNEE_FILTER_OPTIONS = [
  { value: "ALL" as const, label: "All Assignees" },
  ...Object.values(AssigneeRole).map((role) => ({
    value: role,
    label: role.charAt(0) + role.slice(1).toLowerCase(),
  })),
];

export function BoardFilter({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  assigneeFilter,
  onAssigneeChange,
  onClearFilters,
  hasActiveFilters,
}: BoardFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 mb-8 bg-card p-4 rounded-xl border shadow-sm">
      <div className="flex-1 min-w-[300px]">
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by title or ID..."
          className="search-input h-10"
          icon={<Search size={16} />}
          rightElement={
            searchQuery ? (
              <button
                className="hover:text-destructive transition-colors"
                onClick={() => onSearchChange("")}
              >
                <X size={14} />
              </button>
            ) : undefined
          }
        />
      </div>

      <div className="flex gap-4">
        <div className="w-[180px]">
          <Dropdown
            label="Priority Filter"
            value={priorityFilter}
            onChange={onPriorityChange}
            options={PRIORITY_FILTER_OPTIONS}
          />
        </div>
        <div className="w-[180px]">
          <Dropdown
            label="Assignee Filter"
            value={assigneeFilter}
            onChange={onAssigneeChange}
            options={ASSIGNEE_FILTER_OPTIONS}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive h-10 px-4"
          onClick={onClearFilters}
        >
          <X size={14} className="mr-2" />
          Clear All
        </Button>
      )}
    </div>
  );
}
