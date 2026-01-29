/**
 * Docs Header Actions Component
 *
 * Displays header actions for documentation editor.
 * Includes mode toggle, new doc, and save buttons.
 *
 * @example
 * <DocsHeaderActions
 *   selectedDoc={doc}
 *   contentMode="edit"
 *   setContentMode={setMode}
 *   onNewDoc={handleNew}
 *   onSave={handleSave}
 *   hasUnsavedChanges={true}
 * />
 */

"use client";

import { type Doc, type DocGroup } from "@locusai/shared";
import { FolderOpen, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface DocsHeaderActionsProps {
  /** Selected doc or null */
  selectedDoc: Doc | null;
  /** Current editor mode */
  contentMode: "edit" | "preview";
  /** Called when changing mode */
  setContentMode: (mode: "edit" | "preview") => void;
  /** Called to create new doc */
  onNewDoc: () => void;
  /** Called to save doc */
  onSave: () => void;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Available doc groups */
  groups: DocGroup[];
  /** Called when changing doc group */
  onGroupChange: (docId: string, groupId: string | null) => void;
}

export function DocsHeaderActions({
  selectedDoc,
  contentMode,
  setContentMode,
  onNewDoc,
  onSave,
  hasUnsavedChanges,
  groups,
  onGroupChange,
}: DocsHeaderActionsProps) {
  return (
    <div className="flex items-center gap-3">
      {selectedDoc && (
        <>
          <div className="flex bg-secondary/30 p-1 rounded-xl border border-border/20 shadow-inner mr-2">
            <button
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                contentMode === "edit"
                  ? "bg-background text-primary shadow-sm scale-105"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setContentMode("edit")}
            >
              Edit
            </button>
            <button
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                contentMode === "preview"
                  ? "bg-background text-primary shadow-sm scale-105"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setContentMode("preview")}
            >
              Preview
            </button>
          </div>
          <div className="flex items-center gap-2 bg-secondary/20 px-3 py-1.5 rounded-xl border border-border/20">
            <FolderOpen size={14} className="text-muted-foreground" />
            <select
              value={selectedDoc.groupId || ""}
              onChange={(e) =>
                onGroupChange(selectedDoc.id, e.target.value || null)
              }
              className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer appearance-none pr-2"
            >
              <option value="">Other</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      <Button
        onClick={onNewDoc}
        variant="outline"
        className="h-9 border-border/50"
      >
        <Plus size={16} className="mr-2" />
        New Document
      </Button>
      {selectedDoc && (
        <Button
          onClick={onSave}
          className="h-9 px-6 shadow-lg shadow-primary/20"
          disabled={!hasUnsavedChanges}
        >
          <Save size={16} className="mr-2" />
          Commit
        </Button>
      )}
    </div>
  );
}
