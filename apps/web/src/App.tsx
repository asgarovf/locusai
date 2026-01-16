import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import Board from "./views/Board";
import Docs from "./views/Docs";
import TaskDetail from "./views/TaskDetail";

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <aside className="sidebar">
          <h2>Locus</h2>
          <nav>
            <ul>
              <li>
                <NavLink to="/">Board</NavLink>
              </li>
              <li>
                <NavLink to="/docs">Docs</NavLink>
              </li>
            </ul>
          </nav>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Board />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/docs" element={<Docs />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
