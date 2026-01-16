import MDEditor from "@uiw/react-md-editor";
import { File, FileText, Folder, Plus, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface DocNode {
  type: "file" | "directory";
  name: string;
  path: string;
  children?: DocNode[];
}

export default function Docs() {
  const [tree, setTree] = useState<DocNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const fetchTree = useCallback(() => {
    fetch("/api/docs/tree")
      .then((res) => res.json())
      .then(setTree);
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  useEffect(() => {
    if (selectedPath) {
      fetch(`/api/docs/read?path=${encodeURIComponent(selectedPath)}`)
        .then((res) => res.json())
        .then((data) => setContent(data.content || ""));
    }
  }, [selectedPath]);

  const handleSave = () => {
    if (!selectedPath) return;
    fetch("/api/docs/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedPath, content }),
    }).then(() => {
      // Show some temporary success state if needed
    });
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    const path = newFileName.endsWith(".md")
      ? newFileName
      : `${newFileName}.md`;

    try {
      const res = await fetch("/api/docs/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          content:
            "# " +
            (newFileName.split("/").pop()?.replace(".md", "") ||
              "New Document"),
        }),
      });

      if (res.ok) {
        setIsCreating(false);
        setNewFileName("");
        fetchTree();
        setSelectedPath(path);
      }
    } catch (err) {
      console.error("Failed to create file", err);
    }
  };

  const renderTree = (nodes: DocNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`tree-item ${selectedPath === node.path ? "active" : ""}`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => {
            if (node.type === "file") {
              setSelectedPath(node.path);
            }
          }}
        >
          {node.type === "directory" ? (
            <Folder size={16} color="var(--accent)" />
          ) : (
            <FileText size={16} color="var(--text-muted)" />
          )}
          <span className="node-name">{node.name}</span>
        </div>
        {node.children && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="docs-layout">
      <aside className="docs-sidebar glass">
        <div className="docs-sidebar-header">
          <h3>Library</h3>
          <button className="icon-button" onClick={() => setIsCreating(true)}>
            <Plus size={18} />
          </button>
        </div>

        {isCreating && (
          <div className="create-file-box glass">
            <input
              autoFocus
              className="create-input"
              placeholder="filename.md"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFile();
                if (e.key === "Escape") setIsCreating(false);
              }}
            />
            <div
              style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}
            >
              <button className="button-primary-sm" onClick={handleCreateFile}>
                Create
              </button>
              <button
                className="button-secondary-sm"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="tree-container">{renderTree(tree)}</div>
      </aside>

      <main className="editor-container">
        {selectedPath ? (
          <div className="editor-wrapper" data-color-mode="dark">
            <header className="editor-header">
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <FileText size={18} color="var(--accent)" />
                <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                  {selectedPath}
                </span>
              </div>
              <button className="button-primary" onClick={handleSave}>
                <Save size={16} />
                <span>Save Changes</span>
              </button>
            </header>
            <div className="glass editor-glass">
              <MDEditor
                value={content}
                onChange={(v) => setContent(v || "")}
                height="calc(100vh - 12rem)"
                preview="edit"
              />
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="glass empty-card">
              <File
                size={48}
                color="var(--border)"
                style={{ marginBottom: "1.5rem" }}
              />
              <h2 style={{ marginBottom: "0.75rem" }}>
                Select a document to edit
              </h2>
              <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
                Pick a file from the library on the left or create a new one to
                get started with your documentation.
              </p>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .docs-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2rem;
          height: calc(100vh - 8rem);
        }
        .docs-sidebar {
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .docs-sidebar-header {
          padding: 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border);
        }
        .tree-container {
          padding: 1rem 0;
          overflow-y: auto;
          flex: 1;
        }
        .tree-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--text-muted);
        }
        .tree-item:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-main);
        }
        .tree-item.active {
          background: rgba(56, 189, 248, 0.08);
          color: var(--accent);
          border-right: 2px solid var(--accent);
        }
        .node-name {
          font-size: 0.875rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .editor-container {
          height: 100%;
        }
        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }
        .editor-glass {
          border-radius: 12px;
          overflow: hidden;
          padding: 1px;
        }
        .empty-state {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .empty-card {
           padding: 4rem;
           border-radius: 24px;
           display: flex;
           flex-direction: column;
           align-items: center;
           max-width: 400px;
        }
        .create-file-box {
          margin: 1rem;
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid var(--accent);
        }
        .create-input {
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text-main);
          font-size: 0.875rem;
          outline: none;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.25rem;
        }
        .button-primary-sm {
          background: var(--accent);
          color: #000;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }
        .button-secondary-sm {
          background: transparent;
          color: var(--text-muted);
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          border: 1px solid var(--border);
          cursor: pointer;
        }
        
        /* MDEditor Overrides */
        .w-md-editor {
          background-color: transparent !important;
          border: none !important;
        }
        .w-md-editor-toolbar {
          background-color: rgba(255, 255, 255, 0.02) !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .w-md-editor-content {
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
}
