import { AlertTriangle, Bot, Database, GitBranch, RadioTower, Search, Server } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <RadioTower size={20} />
          </div>
          <div>
            <span>DebugPilot</span>
            <small>Incident intelligence</small>
          </div>
        </div>
        <div className="sidebar-context">
          <span>Context engine</span>
          <strong>Logs, code, metrics, deploys, memory</strong>
        </div>
        <nav>
          <NavLink to="/dashboard" end>
            <Server size={18} /> Services
          </NavLink>
          <NavLink to="/dashboard/incidents">
            <AlertTriangle size={18} /> Incidents
          </NavLink>
          <NavLink to="/dashboard/alerts">
            <RadioTower size={18} /> Alerts
          </NavLink>
          <NavLink to="/dashboard/ask">
            <Bot size={18} /> Ask
          </NavLink>
        </nav>
        <div className="sidebar-flow" aria-label="DebugPilot context flow">
          <div><GitBranch size={14} /> Repo index</div>
          <div><Search size={14} /> Semantic retrieval</div>
          <div><Database size={14} /> Incident memory</div>
        </div>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
