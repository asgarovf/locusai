import MDEditor from "@uiw/react-md-editor";
import { File, FileText, Folder, Plus, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DocNode, docService } from "@/services";

export function Docs() {
  const [tree, setTree] = useState<DocNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [contentMode, setContentMode] = useState<"edit" | "preview">("edit");

  const fetchTree = useCallback(async () => {
    try {
      const data = await docService.getTree();
      setTree(data);
    } catch (err) {
      console.error("Failed to fetch doc tree", err);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  useEffect(() => {
    if (selectedPath) {
      docService
        .read(selectedPath)
        .then((data) => setContent(data.content || ""));
    }
  }, [selectedPath]);

  const handleSave = async () => {
    if (!selectedPath) return;
    try {
      await docService.write(selectedPath, content);
      // Success state logic could go here
    } catch (err) {
      console.error("Failed to save document", err);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    const path = newFileName.endsWith(".md")
      ? newFileName
      : `${newFileName}.md`;

    try {
      await docService.write(
        path,
        "# " +
          (newFileName.split("/").pop()?.replace(".md", "") || "New Document")
      );
      setIsCreating(false);
      setNewFileName("");
      fetchTree();
      setSelectedPath(path);
    } catch (err) {
      console.error("Failed to create file", err);
    }
  };

  return (
    <div className="flex gap-8 h-[calc(100vh-8rem)]">
      <aside className="w-72 flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
            Library
          </h3>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={18} />
          </Button>
        </div>

        {isCreating && (
          <div className="p-4 bg-secondary/30 border-b animate-in fade-in slide-in-from-top-2 duration-200">
            <Input
              autoFocus
              placeholder="filename.md"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFile();
                if (e.key === "Escape") setIsCreating(false);
              }}
              className="h-8 mb-2"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-7 text-[10px]"
                onClick={handleCreateFile}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 h-7 text-[10px]"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {tree.map((node) => (
            <div key={node.path}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-2 cursor-pointer transition-all hover:bg-secondary/50",
                  selectedPath === node.path
                    ? "bg-accent/10 border-r-2 border-accent text-accent"
                    : "text-muted-foreground"
                )}
                onClick={() => {
                  if (node.type === "file") {
                    setSelectedPath(node.path);
                  }
                }}
              >
                {node.type === "directory" ? (
                  <Folder size={16} className="text-cyan-500" />
                ) : (
                  <FileText size={16} />
                )}
                <span className="text-sm font-medium truncate">
                  {node.name}
                </span>
              </div>
              {/* Note: Simplified recursive rendering for the first level. In a real app we'd use a Recursive component. */}
              {node.children?.map((child) => (
                <div
                  key={child.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 pl-8 cursor-pointer transition-all hover:bg-secondary/50",
                    selectedPath === child.path
                      ? "bg-accent/10 border-r-2 border-accent text-accent"
                      : "text-muted-foreground"
                  )}
                  onClick={() => {
                    if (child.type === "file") {
                      setSelectedPath?.(child.path);
                    }
                  }}
                >
                  <FileText size={16} />
                  <span className="text-sm font-medium truncate">
                    {child.name}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {selectedPath ? (
          <div
            className="flex flex-col h-full space-y-4"
            data-color-mode="dark"
          >
            <header className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-accent/10 rounded-lg shrink-0">
                  <FileText size={20} className="text-accent" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-foreground truncate">
                    {selectedPath?.split("/").pop()}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                    {selectedPath}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-secondary/50 p-1 rounded-md border">
                  <button
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-sm transition-all",
                      contentMode === "edit"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setContentMode("edit")}
                  >
                    Edit
                  </button>
                  <button
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-sm transition-all",
                      contentMode === "preview"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setContentMode("preview")}
                  >
                    Preview
                  </button>
                </div>
                <Button onClick={handleSave} className="h-9">
                  <Save size={16} className="mr-2" />
                  Save
                </Button>
              </div>
            </header>

            <div className="flex-1 bg-card border rounded-xl overflow-hidden shadow-sm p-4 markdown-container">
              <MDEditor
                value={content}
                onChange={(v) => setContent(v || "")}
                height="100%"
                preview={contentMode}
                hideToolbar={contentMode === "preview"}
                className="bg-transparent! border-none! text-foreground!"
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="max-w-md w-full p-12 bg-card border rounded-3xl shadow-lg flex flex-col items-center text-center space-y-4">
              <div className="p-6 bg-secondary/50 rounded-full mb-2">
                <File size={48} className="text-muted-foreground/40" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Select a document
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Pick a file from the library on the left or create a new one to
                get started with your documentation.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
