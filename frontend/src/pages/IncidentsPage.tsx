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
    <section>
      <header className="page-header">
        <div>
          <h1>Incidents</h1>
          <p>Detected failures with root cause summaries.</p>
        </div>
      </header>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Total incidents</span>
          <strong>{incidents.length}</strong>
        </div>
        <div className="summary-card">
          <span>Open</span>
          <strong>{openCount}</strong>
        </div>
        <div className="summary-card">
          <span>High severity</span>
          <strong>{highSeverityCount}</strong>
        </div>
        <div className="summary-card">
          <span>Analyzed</span>
          <strong>{analyzedCount}</strong>
        </div>
      </div>

      {incidents.length === 0 ? (
        <EmptyState message="No incidents detected yet." />
      ) : (
        <div className="incident-list">
          {incidents.map((incident) => (
            <Link className="incident-row" to={`/incidents/${incident._id}`} key={incident._id}>
              <div>
                <div className="incident-title-line">
                  <h2>{incident.title}</h2>
                  <StatusPill label={incident.severity} tone={incident.severity === "high" ? "bad" : incident.severity === "medium" ? "warn" : "neutral"} />
                </div>
                <p>{incident.analysis?.likelyRootCause ?? "Analysis pending"}</p>
              </div>
              <div className="incident-meta">
                <StatusPill label={incident.status} tone={incident.status === "open" ? "bad" : "good"} />
                <span>{incident.occurrenceCount} errors</span>
                <span>{incident.severity}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
