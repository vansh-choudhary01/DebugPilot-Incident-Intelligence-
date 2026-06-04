import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPost, type Incident } from "../api/client.js";
import { StatusPill } from "../components/StatusPill.js";

type Log = {
  _id: string;
  level: string;
  service: string;
  message: string;
  timestamp: string;
  fingerprint: string;
};

type CodeChunk = {
  _id: string;
  filePath: string;
  content: string;
};

type IncidentDetails = Incident & {
  logs: Log[];
  relatedCodeChunks: CodeChunk[];
  similarIncidents: Array<{ _id: string; title: string; rootCause: string }>;
};

export function IncidentDetailsPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState<IncidentDetails | null>(null);

  async function load() {
    if (!id) return;
    setIncident(await apiGet<IncidentDetails>(`/incidents/${id}`));
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function resolveIncident() {
    if (!id) return;
    await apiPost(`/incidents/${id}/resolve`);
    await load();
  }

  if (!incident) {
    return <div className="empty-state">Loading incident.</div>;
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{incident.title}</h1>
          <p>{incident.service} · {incident.fingerprint}</p>
        </div>
        <button onClick={resolveIncident}>
          <CheckCircle size={16} /> Resolve
        </button>
      </header>

      <div className="detail-grid">
        <div className="panel">
          <h2>Root Cause</h2>
          <StatusPill label={incident.status} tone={incident.status === "open" ? "bad" : "good"} />
          <p>{incident.analysis?.whatHappened ?? "Analysis pending."}</p>
          <strong>{incident.analysis?.likelyRootCause}</strong>
          <p>Confidence: {Math.round((incident.analysis?.confidenceScore ?? 0) * 100)}%</p>
        </div>
        <div className="panel">
          <h2>Suggested Fixes</h2>
          <ul>
            {(incident.analysis?.suggestedFixes ?? []).map((fix) => <li key={fix}>{fix}</li>)}
          </ul>
        </div>
      </div>

      <div className="detail-grid">
        <div className="panel">
          <h2>Related Code</h2>
          {incident.relatedCodeChunks.map((chunk) => (
            <details key={chunk._id}>
              <summary>{chunk.filePath}</summary>
              <pre>{chunk.content}</pre>
            </details>
          ))}
        </div>
        <div className="panel">
          <h2>Similar Incidents</h2>
          {incident.similarIncidents.map((memory) => (
            <p key={memory._id}><strong>{memory.title}</strong><br />{memory.rootCause}</p>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Relevant Logs</h2>
        {incident.logs.map((log) => (
          <code className="log-line" key={log._id}>
            [{new Date(log.timestamp).toLocaleString()}] {log.level} {log.service}: {log.message}
          </code>
        ))}
      </div>
    </section>
  );
}
