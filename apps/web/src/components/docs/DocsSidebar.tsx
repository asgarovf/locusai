"use client";

import { type Doc } from "@locusai/shared";
import { File, FileText, Search, Trash2, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { DOC_TEMPLATES } from "@/hooks";
import { cn } from "@/lib/utils";

interface DocsSidebarProps {
  docs: Doc[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isCreating: boolean;
  setIsCreating: (value: boolean) => void;
  newFileName: string;
  setNewFileName: (name: string) => void;
  selectedTemplate: string;
  onTemplateSelect: (id: string) => void;
  onCreateFile: () => void;
  onDelete: (id: string) => void;
}

export function DocsSidebar({
  docs,
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
}: DocsSidebarProps) {
  return (
    <aside className="w-80 flex flex-col bg-card/30 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div className="p-4 border-b border-border/40 bg-card/10">
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
      </div>

      {/* Create Document Form */}
      {isCreating && (
        <div className="p-5 bg-primary/5 border-b border-border/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Deploy Document
            </span>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              onClick={() => setIsCreating(false)}
            >
              <X size={16} />
            </button>
          </div>

          <Input
            autoFocus
            placeholder="document-handle..."
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="h-9 mb-4 bg-background/50 border-border/40 rounded-xl font-mono text-xs"
          />

          <div className="mb-4">
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
            Initialize Node
          </Button>
        </div>
      )}

      {/* Flat List */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {docs.length > 0 ? (
          <div className="space-y-1">
            {docs.map((doc) => (
              <button
                key={doc.id}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg transition-all group",
                  selectedId === doc.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
                onClick={() => onSelect(doc.id)}
              >
                <FileText size={16} className="shrink-0" />
                <span className="truncate capitalize text-xs">
                  {doc.title.replace(/[-_]/g, " ")}
                </span>
                <button
                  className="ml-auto p-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(doc.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <File size={32} className="mb-4 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              No Nodes Detected
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
