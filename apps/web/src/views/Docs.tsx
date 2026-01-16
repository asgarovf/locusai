import MDEditor from "@uiw/react-md-editor";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetch("/api/docs/tree")
      .then((res) => res.json())
      .then(setTree);
  }, []);

  useEffect(() => {
    if (selectedPath) {
      fetch(`/api/docs/read?path=${encodeURIComponent(selectedPath)}`)
        .then((res) => res.json())
        .then((data) => setContent(data.content));
    }
  }, [selectedPath]);

  const handleSave = () => {
    if (!selectedPath) return;
    fetch("/api/docs/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedPath, content }),
    }).then(() => alert("Saved!"));
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "250px 1fr",
        gap: "1rem",
        height: "100%",
      }}
    >
      <div
        style={{ background: "#1e293b", padding: "1rem", borderRadius: "8px" }}
      >
        <h3>Documents</h3>
        <ul>
          {tree.map((node) => (
            <li
              key={node.path}
              onClick={() => node.type === "file" && setSelectedPath(node.path)}
              style={{
                cursor: "pointer",
                color: selectedPath === node.path ? "#38bdf8" : "inherit",
              }}
            >
              {node.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="container" data-color-mode="dark">
        <div
          style={{
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <h4>{selectedPath || "Select a file"}</h4>
          <button
            onClick={handleSave}
            disabled={!selectedPath}
            style={{
              background: "#38bdf8",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
        <MDEditor
          value={content}
          onChange={(v) => setContent(v || "")}
          height="calc(100vh - 10rem)"
        />
      </div>
    </div>
  );
}
