import { AlertTriangle, Brain, CheckCircle, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, type Incident } from "../api/client.js";
import { EmptyState } from "../components/EmptyState.js";
import { StatusPill } from "../components/StatusPill.js";

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    void apiGet<Incident[]>("/incidents").then(setIncidents);
  }, []);

  const openCount = incidents.filter((incident) => incident.status === "open").length;
  const highSeverityCount = incidents.filter((incident) => incident.severity === "high").length;
  const analyzedCount = incidents.filter((incident) => Boolean(incident.analysis)).length;

  return (
    <section className="dashboard-page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Incidents</span>
          <h1>Failure context queue</h1>
          <p>Detected failures enriched with fingerprints, RCA summaries, and similar incident memory.</p>
        </div>
      </header>

      <div className="summary-grid">
        <div className="summary-card">
          <AlertTriangle size={18} />
          <span>Total incidents</span>
          <strong>{incidents.length}</strong>
        </div>
        <div className="summary-card">
          <Flame size={18} />
          <span>Open</span>
          <strong>{openCount}</strong>
        </div>
        <div className="summary-card">
          <AlertTriangle size={18} />
          <span>High severity</span>
          <strong>{highSeverityCount}</strong>
        </div>
        <div className="summary-card">
          <Brain size={18} />
          <span>Analyzed</span>
          <strong>{analyzedCount}</strong>
        </div>
      </div>

      {incidents.length === 0 ? (
        <EmptyState message="No incidents detected yet." />
      ) : (
        <div className="incident-list">
          {incidents.map((incident) => (
            <Link className="incident-row" to={`/dashboard/incidents/${incident._id}`} key={incident._id}>
              <div>
                <div className="incident-title-line">
                  <h2>{incident.title}</h2>
                  <StatusPill label={incident.severity} tone={incident.severity === "high" ? "bad" : incident.severity === "medium" ? "warn" : "neutral"} />
                </div>
                <p>{incident.analysis?.likelyRootCause ?? "Analysis pending. DebugPilot is waiting for enough context to explain the failure."}</p>
                <div className="incident-context-line">
                  <span>{incident.service}</span>
                  <span>{incident.fingerprint}</span>
                </div>
              </div>
              <div className="incident-meta">
                <StatusPill label={incident.status} tone={incident.status === "open" ? "bad" : "good"} />
                <span>{incident.occurrenceCount} grouped errors</span>
                <span>{incident.analysis ? <><CheckCircle size={12} /> RCA ready</> : "RCA pending"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
