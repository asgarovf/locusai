/**
 * Docs Sidebar Component
 *
 * Displays documentation file/folder hierarchy with search and creation.
 * Supports doc groups, file search, templates, and deletion.
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

import { type Doc, type DocGroup } from "@locusai/shared";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileText,
  FolderPlus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SecondaryText, SectionLabel } from "@/components/typography";
import { Button, Input } from "@/components/ui";
import { DOC_TEMPLATES } from "@/hooks";
import { cn } from "@/lib/utils";

interface DocsSidebarProps {
  /** Doc groups/folders */
  groups: DocGroup[];
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
  /** Called to delete doc/group */
  onDelete: (id: string) => void;
  /** Called to create new group */
  onCreateGroup: (name: string) => void;
  /** Currently selected group */
  selectedGroupId: string | null;
  /** Called when selecting group */
  onGroupSelect: (id: string | null) => void;
}

export function DocsSidebar({
  groups,
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
}: DocsSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["ungrouped"])
  );
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

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

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName("");
      setIsCreatingGroup(false);
    }
  };

  const renderDocItem = (doc: Doc) => (
    <div
      key={doc.id}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium rounded-lg transition-all group/item cursor-pointer",
        selectedId === doc.id
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground/80 hover:bg-secondary/50 hover:text-foreground"
      )}
      onClick={() => onSelect(doc.id)}
    >
      <FileText size={14} className="shrink-0 opacity-70" />
      <span className="truncate capitalize">
        {doc.title.replace(/[-_]/g, " ")}
      </span>
      <button
        type="button"
        className="ml-auto p-1 opacity-0 group-hover/item:opacity-100 hover:text-destructive transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(doc.id);
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );

  return (
    <aside className="w-80 flex flex-col bg-card/30 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div className="p-4 space-y-3 border-b border-border/40 bg-card/10">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <Input
            placeholder="Search library..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-9 text-xs bg-secondary/20 border-border/30 focus:bg-secondary/40 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-[10px] uppercase font-black tracking-widest gap-2 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} /> New Doc
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-[10px] uppercase font-black tracking-widest gap-2 hover:bg-secondary/50"
            onClick={() => setIsCreatingGroup(true)}
          >
            <FolderPlus size={14} /> New Group
          </Button>
        </div>
      </div>

      {/* Item Creation Form */}
      {(isCreating || isCreatingGroup) && (
        <div className="p-5 bg-primary/5 border-b border-border/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel className="text-primary">
              {isCreatingGroup ? "Create Group" : "Create Node"}
            </SectionLabel>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              onClick={() => {
                setIsCreating(false);
                setIsCreatingGroup(false);
              }}
            >
              <X size={16} />
            </button>
          </div>

          {isCreatingGroup ? (
            <form onSubmit={handleCreateGroup}>
              <Input
                autoFocus
                placeholder="group-name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="h-9 mb-4 bg-background/50 border-border/40 rounded-xl font-mono text-xs"
              />
              <Button
                type="submit"
                className="w-full h-9 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 rounded-xl"
                disabled={!newGroupName.trim()}
              >
                Create Group
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Input
                autoFocus
                placeholder="document-handle..."
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="h-9 bg-background/50 border-border/40 rounded-xl font-mono text-xs"
              />

              <div className="space-y-2">
                <SecondaryText size="xs" className="ml-1">
                  Assign to Group
                </SecondaryText>
                <select
                  value={selectedGroupId || ""}
                  onChange={(e) => onGroupSelect(e.target.value || null)}
                  className="w-full h-9 bg-background/50 border border-border/40 rounded-xl text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer"
                >
                  <option value="">No Group (Root)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <SecondaryText size="xs" className="ml-1">
                  Blueprint Template
                </SecondaryText>
                <div className="grid grid-cols-2 gap-2">
                  {DOC_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      className={cn(
                        "px-3 py-2 text-[10px] font-bold rounded-xl border transition-all text-left uppercase tracking-wider",
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/10 text-primary shadow-inner"
                          : "border-border/20 text-muted-foreground/60 hover:border-border/40 hover:bg-secondary/30"
                      )}
                      onClick={() => onTemplateSelect(template.id)}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full h-9 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 rounded-xl"
                onClick={onCreateFile}
                disabled={!newFileName.trim()}
              >
                Create Document
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Grouped Document List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        {/* Render Groups */}
        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            <button
              onClick={() => toggleGroup(group.id)}
              className="flex items-center gap-2 w-full px-2 py-1 text-muted-foreground/70 hover:text-foreground transition-colors group"
            >
              {expandedGroups.has(group.id) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <SectionLabel className="m-0 flex-1">{group.name}</SectionLabel>
              <span className="ml-auto opacity-0 group-hover:opacity-100 bg-secondary/50 px-1.5 py-0.5 rounded text-[8px]">
                {docsByGroup[group.id]?.length || 0}
              </span>
            </button>
            {expandedGroups.has(group.id) && (
              <div className="pl-2 space-y-0.5 border-l border-border/20 ml-3.5 mt-1">
                {docsByGroup[group.id]?.length > 0 ? (
                  docsByGroup[group.id].map(renderDocItem)
                ) : (
                  <div className="py-2 px-3 text-[10px] text-muted-foreground/40 italic">
                    Empty group
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Render Ungrouped Documents */}
        <div className="space-y-1">
          <button
            onClick={() => toggleGroup("ungrouped")}
            className="flex items-center gap-2 w-full px-2 py-1 text-muted-foreground/70 hover:text-foreground transition-colors group"
          >
            {expandedGroups.has("ungrouped") ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            <SectionLabel className="m-0 flex-1">Unsorted</SectionLabel>
            <span className="ml-auto opacity-0 group-hover:opacity-100 bg-secondary/50 px-1.5 py-0.5 rounded text-[8px]">
              {docsByGroup.ungrouped?.length || 0}
            </span>
          </button>
          {expandedGroups.has("ungrouped") && (
            <div className="pl-2 space-y-0.5 border-l border-border/20 ml-3.5 mt-1">
              {docsByGroup.ungrouped?.length > 0 ? (
                docsByGroup.ungrouped.map(renderDocItem)
              ) : (
                <div className="py-2 px-3 text-[10px] text-muted-foreground/40 italic">
                  No files
                </div>
              )}
            </div>
          )}
        </div>

        {groups.length === 0 && docsByGroup.ungrouped?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <File size={32} className="mb-4 text-muted-foreground" />
            <SecondaryText size="xs">Library Empty</SecondaryText>
          </div>
        )}
      </div>
    </aside>
  );
}
