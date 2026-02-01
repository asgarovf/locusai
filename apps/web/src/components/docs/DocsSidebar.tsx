/**
 * Docs Sidebar Component
 *
 * Enhanced documentation file/folder hierarchy with:
 * - Drag-and-drop reordering
 * - Context menus
 * - Recent documents section
 * - Keyboard navigation
 * - Search with filters
 *
 * @example
 * <DocsSidebar
 *   groups={groups}
 *   docsByGroup={docsMap}
 *   selectedId={activeId}
 *   onSelect={handleSelect}
 *   // ... other props
 * />
 */

"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { type Doc, type DocGroup } from "@locusai/shared";
import { File, FileText, FolderPlus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SecondaryText } from "@/components/typography";
import { Button } from "@/components/ui";
import {
  CreateDocForm,
  CreateGroupForm,
  GroupTree,
  RecentDocs,
  SearchInput,
  type SearchInputRef,
} from "./sidebar";

interface DocsSidebarProps {
  /** Doc groups/folders */
  groups: DocGroup[];
  /** All docs (for recent section) */
  allDocs: Doc[];
  /** Docs organized by group ID */
  docsByGroup: Record<string, Doc[]>;
  /** Currently selected doc ID */
  selectedId: string | null;
  /** Called when selecting a doc */
  onSelect: (id: string | null) => void;
  /** Search query filter */
  searchQuery: string;
  /** Called when search changes */
  onSearchChange: (query: string) => void;
  /** Whether in creation mode */
  isCreating: boolean;
  /** Set creation mode */
  setIsCreating: (value: boolean) => void;
  /** New file name being created */
  newFileName: string;
  /** Set new file name */
  setNewFileName: (name: string) => void;
  /** Selected template ID */
  selectedTemplate: string;
  /** Called when selecting template */
  onTemplateSelect: (id: string) => void;
  /** Called to create new file */
  onCreateFile: () => void;
  /** Called to delete doc */
  onDelete: (id: string) => void;
  /** Called to create new group */
  onCreateGroup: (name: string) => void;
  /** Currently selected group */
  selectedGroupId: string | null;
  /** Called when selecting group */
  onGroupSelect: (id: string | null) => void;
  /** Called to duplicate a doc */
  onDuplicate?: (doc: Doc) => void;
  /** Called to start renaming a doc */
  onRename?: (doc: Doc) => void;
  /** Called when doc order changes */
  onReorder?: (docId: string, newGroupId: string | null) => void;
  /** Called to delete a group */
  onDeleteGroup?: (groupId: string) => void;
  /** Called to rename a group */
  onRenameGroup?: (groupId: string, currentName: string) => void;
}

export function DocsSidebar({
  groups,
  allDocs,
  docsByGroup,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  isCreating,
  setIsCreating,
  newFileName,
  setNewFileName,
  selectedTemplate,
  onTemplateSelect,
  onCreateFile,
  onDelete,
  onCreateGroup,
  selectedGroupId,
  onGroupSelect,
  onDuplicate,
  onRename,
  onReorder,
  onDeleteGroup,
  onRenameGroup,
}: DocsSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["ungrouped"])
  );
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const showRecent = true;
  const searchInputRef = useRef<SearchInputRef>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-expand all groups on mount
  useEffect(() => {
    setExpandedGroups(new Set(["ungrouped", ...groups.map((g) => g.id)]));
  }, [groups]);

  const toggleGroup = (groupId: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    setExpandedGroups(next);
  };

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Handle reordering logic
    if (onReorder) {
      let targetGroupId: string | null = null;

      // Check if dropped on a group container
      const overId = over.id as string;
      if (overId.startsWith("group-")) {
        // Dropped on a group - extract the group ID
        const groupId = overId.replace("group-", "");
        targetGroupId = groupId === "ungrouped" ? null : groupId;
      } else {
        // Dropped on another doc - find which group that doc belongs to
        targetGroupId = findGroupForDoc(overId);
      }

      onReorder(active.id as string, targetGroupId);
    }
  };

  const findGroupForDoc = (docId: string): string | null => {
    for (const [groupId, docs] of Object.entries(docsByGroup)) {
      if (docs.some((d) => d.id === docId)) {
        return groupId === "ungrouped" ? null : groupId;
      }
    }
    return null;
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    // Navigate search results with arrow keys
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const allDocs = Object.values(docsByGroup).flat();
      const currentIndex = allDocs.findIndex((d) => d.id === selectedId);

      if (e.key === "ArrowDown") {
        const nextIndex =
          currentIndex < allDocs.length - 1 ? currentIndex + 1 : 0;
        onSelect(allDocs[nextIndex]?.id || null);
      } else {
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : allDocs.length - 1;
        onSelect(allDocs[prevIndex]?.id || null);
      }
    }

    // Enter to select/confirm
    if (e.key === "Enter" && searchQuery) {
      const firstMatch = Object.values(docsByGroup).flat()[0];
      if (firstMatch) {
        onSelect(firstMatch.id);
      }
    }

    // Escape to clear search
    if (e.key === "Escape") {
      onSearchChange("");
    }
  };

  const activeDragDoc = activeId
    ? Object.values(docsByGroup)
        .flat()
        .find((d) => d.id === activeId)
    : null;

  const totalDocs = Object.values(docsByGroup).flat().length;
  const hasResults = totalDocs > 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <aside className="w-80 flex flex-col bg-card/30 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        {/* Header with Search and Actions */}
        <div className="p-4 space-y-3 border-b border-border/40 bg-card/10">
          <SearchInput
            ref={searchInputRef}
            value={searchQuery}
            onChange={onSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search documents..."
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-[10px] uppercase font-black tracking-widest gap-2 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20"
              onClick={() => {
                setIsCreating(true);
                setIsCreatingGroup(false);
              }}
            >
              <Plus size={14} /> New Doc
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-[10px] uppercase font-black tracking-widest gap-2 hover:bg-secondary/50"
              onClick={() => {
                setIsCreatingGroup(true);
                setIsCreating(false);
              }}
            >
              <FolderPlus size={14} /> New Group
            </Button>
          </div>
        </div>

        {/* Creation Forms */}
        {isCreating && (
          <CreateDocForm
            fileName={newFileName}
            onFileNameChange={setNewFileName}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={onTemplateSelect}
            selectedGroupId={selectedGroupId}
            onGroupSelect={onGroupSelect}
            groups={groups}
            onSubmit={onCreateFile}
            onCancel={() => setIsCreating(false)}
          />
        )}

        {isCreatingGroup && (
          <CreateGroupForm
            onSubmit={(name) => {
              onCreateGroup(name);
              setIsCreatingGroup(false);
            }}
            onCancel={() => setIsCreatingGroup(false)}
          />
        )}

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
          {/* Recent Documents Section */}
          {!searchQuery && showRecent && allDocs.length > 0 && (
            <RecentDocs
              docs={allDocs}
              selectedId={selectedId}
              onSelect={onSelect}
              maxItems={3}
            />
          )}

          {/* Search Results Indicator */}
          {searchQuery && (
            <div className="px-2 py-1">
              <SecondaryText size="xs" className="text-muted-foreground/60">
                {hasResults
                  ? `${totalDocs} result${totalDocs !== 1 ? "s" : ""} for "${searchQuery}"`
                  : `No results for "${searchQuery}"`}
              </SecondaryText>
            </div>
          )}

          {/* Render Groups */}
          {groups.map((group) => (
            <GroupTree
              key={group.id}
              group={group}
              docs={docsByGroup[group.id] || []}
              isExpanded={expandedGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              selectedId={selectedId}
              onSelectDoc={onSelect}
              onDeleteDoc={onDelete}
              onDuplicateDoc={onDuplicate}
              onRenameDoc={onRename}
              onDeleteGroup={() => onDeleteGroup?.(group.id)}
              onRenameGroup={() => onRenameGroup?.(group.id, group.name)}
            />
          ))}

          {/* Render Ungrouped Documents */}
          {(docsByGroup.ungrouped?.length > 0 || !searchQuery) && (
            <GroupTree
              group={{ id: "ungrouped", name: "Other" }}
              docs={docsByGroup.ungrouped || []}
              isExpanded={expandedGroups.has("ungrouped")}
              onToggle={() => toggleGroup("ungrouped")}
              selectedId={selectedId}
              onSelectDoc={onSelect}
              onDeleteDoc={onDelete}
              onDuplicateDoc={onDuplicate}
              onRenameDoc={onRename}
              isUngrouped
            />
          )}

          {/* Empty State */}
          {groups.length === 0 &&
            (!docsByGroup.ungrouped || docsByGroup.ungrouped.length === 0) && (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <File size={32} className="mb-4 text-muted-foreground" />
                <SecondaryText size="xs">Library Empty</SecondaryText>
                <SecondaryText
                  size="xs"
                  className="text-muted-foreground/60 mt-1"
                >
                  Create your first document
                </SecondaryText>
              </div>
            )}
        </div>
      </aside>

      {/* Drag Overlay - rendered outside sidebar to avoid backdrop-blur stacking context issues */}
      <DragOverlay>
        {activeDragDoc && (
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border/60 rounded-lg shadow-lg text-xs font-medium">
            <FileText size={14} className="opacity-70" />
            <span className="truncate capitalize">
              {activeDragDoc.title.replace(/[-_]/g, " ")}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
