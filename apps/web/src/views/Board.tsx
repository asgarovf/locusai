import { type Task, TaskStatus } from "@locus/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const COLUMNS = [
  TaskStatus.BACKLOG,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.VERIFICATION,
  TaskStatus.DONE,
];

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then(setTasks);
  }, []);

  return (
    <div className="board">
      {COLUMNS.map((status) => (
        <div key={status} className="column">
          <div className="column-header">{status}</div>
          <div className="task-list">
            {tasks
              .filter((t) => t.status === status)
              .map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="task-card">
                    <h4>{task.title}</h4>
                    <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                      {task.labels.join(", ")}
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
