/**
 * Doc Item Component
 *
 * A draggable document item with context menu support.
 */

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Doc } from "@locusai/shared";
import {
  Copy,
  ExternalLink,
  FileText,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { ContextMenu, type ContextMenuItem } from "@/components/ui";
import { cn } from "@/lib/utils";

interface DocItemProps {
  doc: Doc;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  isDragging?: boolean;
}

export function DocItem({
  doc,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onRename,
  isDragging = false,
}: DocItemProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: doc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: "Open",
      icon: ExternalLink,
      onClick: onSelect,
    },
    {
      label: "Rename",
      icon: Pencil,
      onClick: onRename,
      shortcut: "F2",
    },
    {
      label: "Duplicate",
      icon: Copy,
      onClick: onDuplicate,
      shortcut: "⌘D",
    },
    { type: "divider" },
    {
      label: "Delete",
      icon: Trash2,
      onClick: onDelete,
      variant: "danger",
      shortcut: "⌫",
    },
  ];

  const isCurrentlyDragging = isDragging || isSortableDragging;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-medium rounded-lg transition-all group/item cursor-pointer",
          isSelected
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground/80 hover:bg-secondary/50 hover:text-foreground",
          isCurrentlyDragging && "opacity-50 shadow-lg scale-[1.02]"
        )}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
      >
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "p-0.5 cursor-grab opacity-0 group-hover/item:opacity-100 transition-opacity",
            isSelected && "opacity-70"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={12} />
        </div>
        <FileText size={14} className="shrink-0 opacity-70" />
        <span className="truncate flex-1 capitalize">
          {doc.title.replace(/[-_]/g, " ")}
        </span>
        <button
          type="button"
          className={cn(
            "p-1 opacity-0 group-hover/item:opacity-100 transition-opacity rounded hover:bg-black/10",
            isSelected && "hover:bg-white/10"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleContextMenu(e);
          }}
        >
          <MoreHorizontal size={12} />
        </button>
      </div>

      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          items={contextMenuItems}
        />
      )}
    </>
  );
}
