import {
  type Artifact,
  type Event,
  type Task,
  TaskStatus,
} from "@locus/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Event[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [newComment, setNewComment] = useState("");

  const refresh = useCallback(() => {
    fetch(`/api/tasks/${id}`)
      .then((res) => res.json())
      .then(setTask);
    fetch(`/api/events?taskId=${id}`)
      .then((res) => res.json())
      .then(setComments); // Using events as a simplified feed
    fetch(`/api/tasks/${id}/artifacts`)
      .then((res) => res.json())
      .then(setArtifacts);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStatus = (status: string) => {
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then(refresh);
  };

  const addComment = () => {
    fetch(`/api/tasks/${id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: "Human", text: newComment }),
    }).then(() => {
      setNewComment("");
      refresh();
    });
  };

  const runCi = (preset: string) => {
    fetch("/api/ci/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: id ? Number.parseInt(id, 10) : 0,
        preset,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        alert(data.summary);
        refresh();
      });
  };

  if (!task) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: "800px" }}>
      <button onClick={() => navigate("/")}>&larr; Back</button>
      <h2>{task.title}</h2>
      <p style={{ opacity: 0.8 }}>{task.description}</p>

      <div style={{ margin: "1rem 0", display: "flex", gap: "0.5rem" }}>
        <strong>Status: {task.status}</strong>
        {Object.values(TaskStatus).map((s) => (
          <button
            key={s}
            onClick={() => updateStatus(s)}
            disabled={task.status === s}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ margin: "1rem 0" }}>
        <button onClick={() => runCi("quick")}>Run Quick Checks</button>
        <button onClick={() => runCi("full")} style={{ marginLeft: "0.5rem" }}>
          Run Full Checks
        </button>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}
      >
        <div>
          <h3>Artifacts</h3>
          {artifacts.map((a) => (
            <div
              key={a.id}
              style={{
                background: "#1e293b",
                padding: "0.5rem",
                marginBottom: "0.5rem",
                borderRadius: "4px",
              }}
            >
              <strong>{a.title}</strong> ({a.type})
              {a.type === "CI_OUTPUT" && (
                <pre
                  style={{
                    fontSize: "0.7rem",
                    overflowX: "auto",
                    maxHeight: "200px",
                  }}
                >
                  {a.contentText}
                </pre>
              )}
            </div>
          ))}
        </div>
        <div>
          <h3>Activity Feed</h3>
          <div style={{ marginBottom: "1rem" }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{ width: "100%", minHeight: "60px" }}
            />
            <button onClick={addComment}>Comment</button>
          </div>
          {comments.map((e) => (
            <div
              key={e.id}
              style={{
                borderBottom: "1px solid #334155",
                padding: "0.5rem 0",
                fontSize: "0.9rem",
              }}
            >
              <span style={{ opacity: 0.6 }}>
                [{new Date(e.createdAt).toLocaleTimeString()}]
              </span>{" "}
              {e.type}: {JSON.stringify(e.payload)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
