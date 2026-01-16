import { AssigneeRole, TaskPriority } from "@locus/shared";
import { Search, X } from "lucide-react";
import { Dropdown } from "./ui/Dropdown";

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
    <div className="board-filter">
      <div className="search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          className="search-input"
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => onSearchChange("")}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="filter-dropdowns">
        <div className="filter-dropdown">
          <Dropdown
            value={priorityFilter}
            onChange={onPriorityChange}
            options={PRIORITY_FILTER_OPTIONS}
          />
        </div>
        <div className="filter-dropdown">
          <Dropdown
            value={assigneeFilter}
            onChange={onAssigneeChange}
            options={ASSIGNEE_FILTER_OPTIONS}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <button className="clear-filters" onClick={onClearFilters}>
          <X size={14} />
          Clear Filters
        </button>
      )}

      <style>{`
        .board-filter {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          width: 280px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 2.25rem 0.625rem 2.5rem;
          background: var(--glass-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-main);
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .clear-search {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .clear-search:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.05);
        }

        .filter-dropdowns {
          display: flex;
          gap: 0.75rem;
        }

        .filter-dropdown {
          width: 160px;
        }

        .clear-filters {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: none;
          border-radius: 6px;
          color: #ef4444;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .clear-filters:hover {
          background: rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </div>
  );
}
