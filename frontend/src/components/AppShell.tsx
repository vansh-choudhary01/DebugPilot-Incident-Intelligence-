import { Activity, AlertTriangle, Bot, RadioTower } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <RadioTower size={24} />
          <span>DebugPilot</span>
        </div>
        <nav>
          <NavLink to="/">
            <Activity size={18} /> Services
          </NavLink>
          <NavLink to="/incidents">
            <AlertTriangle size={18} /> Incidents
          </NavLink>
          <NavLink to="/alerts">
            <RadioTower size={18} /> Alerts
          </NavLink>
          <NavLink to="/ask">
            <Bot size={18} /> Ask
          </NavLink>
        </nav>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
