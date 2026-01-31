/**
 * Board page header component
 * Displays sprint info and new task button
 */

import { type Sprint } from "@locusai/shared";
import { LayoutGrid, Network, Plus, Workflow } from "lucide-react";
import { Button, Toggle, Tooltip } from "@/components/ui";

type ViewType = "board" | "mindmap" | "canvas";

interface BoardHeaderProps {
  activeSprint?: Sprint | null;
  filteredTasksCount: number;
  onNewTask: () => void;
  isCompact: boolean;
  onToggleCompact: () => void;
  view?: ViewType;
  onViewChange?: (view: ViewType) => void;
}

const viewTypes = [
  {
    id: "board" as ViewType,
    label: "Board",
    icon: LayoutGrid,
    tooltip: "Classic kanban board with status columns (default)",
  },
  {
    id: "mindmap" as ViewType,
    label: "Mindmap",
    icon: Network,
    tooltip:
      "AI-generated visualization of task relationships and dependencies",
  },
  {
    id: "canvas" as ViewType,
    label: "Canvas",
    icon: Workflow,
    tooltip: "Flowchart visualization for complex task flows (experimental)",
  },
];

export function BoardHeader({
  activeSprint,
  filteredTasksCount,
  onNewTask,
  isCompact,
  onToggleCompact,
  view,
  onViewChange,
}: BoardHeaderProps) {
  return {
    title: "Board",
    description: (
      <div className="flex items-center gap-2">
        {activeSprint ? (
          <>
            <span className="text-primary font-bold">{activeSprint.name}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>{filteredTasksCount} tasks</span>
          </>
        ) : (
          <span>No active sprint</span>
        )}
      </div>
    ),
    actions: (
      <div className="flex items-center gap-1.5 sm:gap-3 max-w-full flex-wrap">
        {view && onViewChange && activeSprint && (
          <div
            id="view-switcher"
            className="flex items-center bg-muted/50 p-0.5 sm:p-1 rounded-lg border flex-shrink-0"
          >
            <div className="flex items-center gap-0.5 sm:gap-1">
              {viewTypes.map((viewType) => (
                <Tooltip key={viewType.id} content={viewType.tooltip}>
                  <Button
                    variant={view === viewType.id ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-1 sm:gap-2 flex-shrink-0 px-1.5 sm:px-3"
                    onClick={() => onViewChange(viewType.id)}
                  >
                    <viewType.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{viewType.label}</span>
                  </Button>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
        <div className="hidden sm:flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50 flex-shrink-0">
          <span className="text-sm font-medium text-muted-foreground mr-1">
            Compact
          </span>
          <Toggle checked={isCompact} onChange={onToggleCompact} />
        </div>
        <Tooltip content="Toggle compact mode">
          <div className="sm:hidden flex items-center bg-secondary/50 px-2 py-1.5 rounded-lg border border-border/50 flex-shrink-0">
            <Toggle checked={isCompact} onChange={onToggleCompact} />
          </div>
        </Tooltip>
        <Button
          onClick={onNewTask}
          size="md"
          className="shadow-lg shadow-primary/20 flex-shrink-0 px-2 sm:px-4"
        >
          <Plus size={16} className="sm:mr-2" />
          <span className="hidden sm:inline">New Task</span>
        </Button>
      </div>
    ),
  };
}
