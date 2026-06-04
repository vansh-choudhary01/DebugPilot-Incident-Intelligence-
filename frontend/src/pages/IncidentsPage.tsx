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

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Incidents</h1>
          <p>Detected failures with root cause summaries.</p>
        </div>
      </header>

      {incidents.length === 0 ? (
        <EmptyState message="No incidents detected yet." />
      ) : (
        <div className="incident-list">
          {incidents.map((incident) => (
            <Link className="incident-row" to={`/incidents/${incident._id}`} key={incident._id}>
              <div>
                <h2>{incident.title}</h2>
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
