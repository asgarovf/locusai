import {
  Command,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import Board from "./views/Board";
import Docs from "./views/Docs";

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div
              className="glass"
              style={{
                padding: "8px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Command size={20} color="var(--accent)" />
            </div>
            <h2>Locus</h2>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <div
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
                marginBottom: "0.75rem",
                fontWeight: 600,
              }}
            >
              Main Menu
            </div>
            <nav>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={{ marginBottom: "0.25rem" }}>
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? "active" : ""}`
                    }
                  >
                    <LayoutDashboard size={18} />
                    <span>Board</span>
                  </NavLink>
                </li>
                <li style={{ marginBottom: "0.25rem" }}>
                  <NavLink
                    to="/docs"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? "active" : ""}`
                    }
                  >
                    <FileText size={18} />
                    <span>Library</span>
                  </NavLink>
                </li>
              </ul>
            </nav>
          </div>

          <div style={{ marginTop: "auto" }}>
            <nav>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li>
                  <button
                    className="nav-link"
                    style={{
                      background: "transparent",
                      border: "none",
                      width: "100%",
                      cursor: "pointer",
                    }}
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </aside>

        <main className="main-content">
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  background: "var(--glass-bg)",
                  padding: "0.5rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  width: "300px",
                }}
              >
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-main)",
                    fontSize: "0.875rem",
                    outline: "none",
                    width: "100%",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="button-secondary">Help</button>
                <button className="button-primary">Share</button>
              </div>
            </header>

            <Routes>
              <Route path="/" element={<Board />} />
              <Route path="/docs" element={<Docs />} />
            </Routes>
          </div>
        </main>
      </div>

      <style>{`
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 0.875rem;
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        
        .nav-link:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.03);
        }
        
        .nav-link.active {
          color: var(--accent);
          background: rgba(56, 189, 248, 0.1);
        }
        
        .nav-link svg {
          transition: transform 0.2s ease;
        }
        
        .nav-link:hover svg {
          transform: scale(1.1);
        }
      `}</style>
    </BrowserRouter>
  );
}

export default App;
