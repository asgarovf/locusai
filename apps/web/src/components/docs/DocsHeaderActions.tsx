"use client";

import { type Doc } from "@locusai/shared";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface DocsHeaderActionsProps {
  selectedDoc: Doc | null;
  contentMode: "edit" | "preview";
  setContentMode: (mode: "edit" | "preview") => void;
  onNewDoc: () => void;
  onSave: () => void;
  hasUnsavedChanges: boolean;
}

export function DocsHeaderActions({
  selectedDoc,
  contentMode,
  setContentMode,
  onNewDoc,
  onSave,
  hasUnsavedChanges,
}: DocsHeaderActionsProps) {
  return (
    <div className="flex items-center gap-3">
      {selectedDoc && (
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
            Forge
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
            Vision
          </button>
        </div>
      )}
      <Button
        onClick={onNewDoc}
        variant="outline"
        className="h-9 border-border/50"
      >
        <Plus size={16} className="mr-2" />
        New Doc
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
