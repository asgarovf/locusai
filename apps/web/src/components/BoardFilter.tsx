"use client";

import { Filter } from "lucide-react";

interface BoardFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilter: string | null;
  onPriorityChange: (priority: string | null) => void;
  roleFilter: string | null;
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
        <option value="ENGINEER">Engineer</option>
        <option value="DESIGNER">Designer</option>
        <option value="PRODUCT">Product</option>
        <option value="QA">QA</option>
        <option value="MANAGER">Manager</option>
      </select>
    </div>
  );
}
