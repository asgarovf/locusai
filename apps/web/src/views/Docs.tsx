import {
  BookOpen,
  File,
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRef } from "react";
import { Editor } from "@/components/Editor";
import { Button, EmptyState, Input } from "@/components/ui";
import { DOC_TEMPLATES, useDocs, useGlobalKeydowns } from "@/hooks";
import { cn } from "@/lib/utils";

export function Docs() {
  const {
    docs,
    selectedId,
    setSelectedId,
    selectedDoc,
    content,
    setContent,
    hasUnsavedChanges,
    isCreating,
    setIsCreating,
    newFileName,
    setNewFileName,
    selectedTemplate,
    setSelectedTemplate,
    contentMode,
    setContentMode,
    searchQuery,
    setSearchQuery,
    activeCategory,
    handleSave,
    handleCreateFile,
    handleDelete,
  } = useDocs();

  const searchInputRef = useRef<HTMLInputElement>(null);

  useGlobalKeydowns({
    onOpenCreateTask: () => {
      // Sidebar handles navigation to backlog
    },
    onOpenCreateSprint: () => {
      // Sidebar handles navigation to backlog
    },
    onCloseCreateTask: () => {
      if (isCreating) setIsCreating(false);
      else if (selectedId) setSelectedId(null);
    },
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <aside className="w-80 flex flex-col bg-card/30 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        {/* Header */}
        <div className="p-5 border-b border-border/40 bg-card/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
              {activeCategory === "all"
                ? "Locus Docs"
                : `${activeCategory} Docs`}
            </h3>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-all rounded-lg"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={18} />
            </Button>
          </div>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
            />
            <Input
              ref={searchInputRef}
              placeholder="Quick search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 text-xs bg-secondary/30 border-border/30 focus:border-primary/40 focus:bg-secondary/50 rounded-xl"
            />
          </div>
        </div>

        {/* Create Document Form */}
        {isCreating && (
          <div className="p-5 bg-primary/5 border-b border-border/40 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-primary">
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
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFile();
                if (e.key === "Escape") setIsCreating(false);
              }}
              className="h-10 mb-4 bg-background/50 border-border/40 focus:ring-primary/20 rounded-xl font-mono text-xs"
            />

            <div className="mb-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block px-1">
                Structural Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DOC_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    className={cn(
                      "px-3 py-2.5 text-[10px] font-bold rounded-xl border transition-all text-left uppercase tracking-wider",
                      selectedTemplate === template.id
                        ? "border-primary bg-primary/10 text-primary shadow-inner"
                        : "border-border/20 text-muted-foreground/60 hover:border-border/40 hover:bg-secondary/30"
                    )}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full h-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 rounded-xl"
              onClick={handleCreateFile}
              disabled={!newFileName.trim()}
            >
              Initialize Node
            </Button>
          </div>
        )}

        {/* Flat List */}
        <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
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
                  onClick={() => setSelectedId(doc.id)}
                >
                  <FileText size={16} className="shrink-0" />
                  <span className="truncate capitalize">
                    {doc.title.replace(/[-_]/g, " ")}
                  </span>
                  <button
                    className="ml-auto p-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
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
              <span className="text-xs font-bold uppercase tracking-widest">
                No Nodes Detected
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {selectedDoc ? (
          <div className="flex flex-col h-full gap-5" data-color-mode="dark">
            {/* Document Header */}
            <header className="flex justify-between items-center bg-card/30 backdrop-blur-xl border border-border/40 p-5 rounded-2xl shadow-xl shadow-black/10">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-primary/10 rounded-2xl shrink-0 border border-primary/20">
                  <FileText size={20} className="text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black text-foreground truncate uppercase tracking-widest">
                    {selectedDoc.title}
                  </span>
                  <span className="text-[10px] font-mono text-primary/60 truncate flex items-center gap-2 mt-1">
                    {selectedId}
                    {hasUnsavedChanges && (
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold uppercase tracking-tighter text-[9px]">
                        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                        Unsaved Changes
                      </div>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-secondary/30 p-1 rounded-xl border border-border/20 shadow-inner">
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
                <Button
                  onClick={handleSave}
                  className="h-10 px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 rounded-xl"
                  disabled={!hasUnsavedChanges}
                >
                  <Save size={14} className="mr-2" />
                  Commit
                </Button>
              </div>
            </header>

            {/* Editor Area */}
            <div className="flex-1 bg-card/20 backdrop-blur-sm border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-black/5 relative group">
              <Editor
                value={content}
                onChange={setContent}
                readOnly={contentMode === "preview"}
              />
              {contentMode === "preview" && (
                <div className="absolute top-4 right-4 text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.3em] pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity">
                  Read Only Vision
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-12 bg-secondary/5 border border-dashed border-border/40 rounded-3xl group transition-all hover:bg-secondary/10">
            <EmptyState
              icon={BookOpen}
              title="Documentation Nexus"
              description="Access the collective engineering intelligence. Forge new product requirements, architectural designs, or team processes using high-fidelity templates."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-11 px-8 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg border-border/40"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus size={16} className="mr-2" />
                  Initialize Node
                </Button>
              }
              className="max-w-xl scale-110 group-hover:scale-[1.12] transition-transform duration-500"
            />
          </div>
        )}
      </main>
    </div>
  );
}
