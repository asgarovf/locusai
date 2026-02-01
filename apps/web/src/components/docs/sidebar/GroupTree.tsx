/**
 * Group Tree Component
 *
 * Renders a collapsible group of documents with drag-and-drop support.
 */

"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Doc, DocGroup } from "@locusai/shared";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { ContextMenu, type ContextMenuItem } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DocItem } from "./DocItem";

interface GroupTreeProps {
  group: DocGroup | { id: "ungrouped"; name: string };
  docs: Doc[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedId: string | null;
  onSelectDoc: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onDuplicateDoc?: (doc: Doc) => void;
  onRenameDoc?: (doc: Doc) => void;
  onDeleteGroup?: () => void;
  onRenameGroup?: () => void;
  isUngrouped?: boolean;
}

export function GroupTree({
  group,
  docs,
  isExpanded,
  onToggle,
  selectedId,
  onSelectDoc,
  onDeleteDoc,
  onDuplicateDoc,
  onRenameDoc,
  onDeleteGroup,
  onRenameGroup,
  isUngrouped = false,
}: GroupTreeProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Make the group a droppable target for cross-group document moves
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${group.id}`,
    data: {
      type: "group",
      groupId: group.id === "ungrouped" ? null : group.id,
    },
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isUngrouped) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const groupContextMenuItems: ContextMenuItem[] = [
    {
      label: "Rename Group",
      icon: Pencil,
      onClick: onRenameGroup,
    },
    { type: "divider" },
    {
      label: "Delete Group",
      icon: Trash2,
      onClick: onDeleteGroup,
      variant: "danger",
    },
  ];

  const FolderIcon = isExpanded ? FolderOpen : Folder;

  return (
    <div ref={setNodeRef} className="space-y-1">
      <button
        onClick={onToggle}
        onContextMenu={handleContextMenu}
        className={cn(
          "flex items-center gap-2 w-full px-2 py-1.5 text-muted-foreground/70 hover:text-foreground transition-colors group rounded-lg hover:bg-secondary/30",
          isOver && "bg-primary/10 ring-2 ring-primary/30"
        )}
      >
        <span className="shrink-0 transition-transform">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <FolderIcon size={14} className="shrink-0 opacity-60" />
        <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wider truncate">
          {group.name}
        </span>
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-md transition-all",
            docs.length > 0
              ? "bg-secondary/50 text-muted-foreground"
              : "bg-transparent text-muted-foreground/40"
          )}
        >
          {docs.length}
        </span>
        {!isUngrouped && (
          <span
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-secondary/60 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e);
            }}
          >
            <MoreHorizontal size={12} />
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="pl-2 space-y-0.5 border-l border-border/20 ml-3.5 mt-1">
          {docs.length > 0 ? (
            <SortableContext
              items={docs.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              {docs.map((doc) => (
                <DocItem
                  key={doc.id}
                  doc={doc}
                  isSelected={selectedId === doc.id}
                  onSelect={() => onSelectDoc(doc.id)}
                  onDelete={() => onDeleteDoc(doc.id)}
                  onDuplicate={() => onDuplicateDoc?.(doc)}
                  onRename={() => onRenameDoc?.(doc)}
                />
              ))}
            </SortableContext>
          ) : (
            <div className="py-2 px-3 text-[10px] text-muted-foreground/40 italic">
              {isUngrouped ? "No ungrouped documents" : "Empty group"}
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          items={groupContextMenuItems}
        />
      )}
    </div>
  );
}
