/**
 * Board Filter Component
 *
 * Provides filtering controls for board view.
 * Supports search, priority filtering, and role filtering.
 * Helps users find and organize tasks efficiently.
 *
 * Features:
 * - Task search by title/content
 * - Priority-based filtering
 * - Role-based filtering
 * - Clear filters button
 * - Real-time filtering
 *
 * @example
 * <BoardFilter
 *   searchQuery={search}
 *   onSearchChange={handleSearch}
 *   priorityFilter={priority}
 *   onPriorityChange={handlePriority}
 *   roleFilter={role}
 *   onRoleChange={handleRole}
 * />
 */

"use client";

import { AssigneeRole } from "@locusai/shared";
import { Filter } from "lucide-react";

interface BoardFilterProps {
  /** Current search query */
  searchQuery: string;
  /** Called when search changes */
  onSearchChange: (query: string) => void;
  /** Currently selected priority filter */
  priorityFilter: string | null;
  /** Called when priority filter changes */
  onPriorityChange: (priority: string | null) => void;
  /** Currently selected role filter */
  roleFilter: string | null;
  /** Called when role filter changes */
  onRoleChange: (role: string | null) => void;
}

export function BoardFilter({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  roleFilter,
  onRoleChange,
}: BoardFilterProps) {
  return (
    <div className="flex items-center flex-wrap gap-3 p-2 bg-secondary/20 rounded-xl border border-border/40">
      {/* Search */}
      <div className="flex-1 min-w-[180px] relative">
        <input
          type="text"
          placeholder="Filter tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-background border border-border/50 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Filter
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
        />
      </div>

      {/* Priority Filter */}
      <select
        value={priorityFilter || ""}
        onChange={(e) => onPriorityChange(e.target.value || null)}
        className="bg-background border border-border/50 rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none h-8"
      >
        <option value="">All Priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>

      {/* Role Filter */}
      <select
        value={roleFilter || ""}
        onChange={(e) => onRoleChange(e.target.value || null)}
        className="bg-background border border-border/50 rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none h-8"
      >
        <option value="">All Roles</option>
        <option value={AssigneeRole.BACKEND}>Backend</option>
        <option value={AssigneeRole.FRONTEND}>Frontend</option>
        <option value={AssigneeRole.QA}>QA</option>
        <option value={AssigneeRole.PM}>PM</option>
        <option value={AssigneeRole.DESIGN}>Design</option>
      </select>
    </div>
  );
}
