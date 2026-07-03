import { Activity, Brain, CheckCircle, Code2, GitCommit, ListChecks, SearchX, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPost, type Deployment, type Incident } from "../api/client.js";
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
  similarIncidents: Array<{
    _id: string;
    title: string;
    rootCause: string;
    suggestedFixes: string[];
    outcome: string;
  }>;
  relatedDeployments: Deployment[];
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
    <section className="dashboard-page incident-detail-page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Incident context</span>
          <h1>{incident.title}</h1>
          <p>{incident.service} / {incident.fingerprint}</p>
        </div>
        <button onClick={resolveIncident} disabled={incident.status === "resolved"}>
          <CheckCircle size={16} /> Resolve
        </button>
      </header>

      <div className="summary-grid">
        <div className="summary-card">
          <Activity size={18} />
          <span>Grouped errors</span>
          <strong>{incident.occurrenceCount}</strong>
        </div>
        <div className="summary-card">
          <ScrollText size={18} />
          <span>Relevant logs</span>
          <strong>{incident.logs.length}</strong>
        </div>
        <div className="summary-card">
          <Code2 size={18} />
          <span>Code chunks</span>
          <strong>{incident.relatedCodeChunks.length}</strong>
        </div>
        <div className="summary-card">
          <Brain size={18} />
          <span>Memory matches</span>
          <strong>{incident.similarIncidents.length}</strong>
        </div>
      </div>

      <div className="detail-grid">
        <div className="panel incident-summary-panel">
          <div className="panel-title">
            <ScrollText size={18} />
            <h2>Incident Summary</h2>
          </div>
          <div className="inline-meta">
            <StatusPill label={incident.status} tone={incident.status === "open" ? "bad" : "good"} />
            <StatusPill label={incident.severity} tone={incident.severity === "high" ? "bad" : incident.severity === "medium" ? "warn" : "neutral"} />
          </div>
          <p>{incident.analysis?.whatHappened ?? "Analysis pending."}</p>
          <div className="confidence-meter">
            <span>RCA confidence</span>
            <strong>{Math.round((incident.analysis?.confidenceScore ?? 0) * 100)}%</strong>
          </div>
        </div>
        <div className="panel root-cause-panel">
          <div className="panel-title">
            <SearchX size={18} />
            <h2>Root Cause</h2>
          </div>
          <p>{incident.analysis?.likelyRootCause ?? "Analysis pending."}</p>
        </div>
      </div>

      <div className="detail-grid evidence-grid">
        <div className="panel">
          <div className="panel-title">
            <ListChecks size={18} />
            <h2>Suggested Fixes</h2>
          </div>
          <ul>
            {(incident.analysis?.suggestedFixes ?? []).map((fix) => <li key={fix}>{fix}</li>)}
          </ul>
        </div>
        <div className="panel">
          <div className="panel-title">
            <GitCommit size={18} />
            <h2>Related Deployments</h2>
          </div>
          {incident.relatedDeployments.length === 0 ? (
            <p>No deployments found near the incident start.</p>
          ) : (
            incident.relatedDeployments.map((deployment) => (
              <p key={deployment._id}>
                <strong>{deployment.commit}</strong><br />
                {new Date(deployment.timestamp).toLocaleString()}
                {deployment.author ? ` by ${deployment.author}` : ""}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="detail-grid evidence-grid">
        <div className="panel">
          <div className="panel-title">
            <Code2 size={18} />
            <h2>Related Code</h2>
          </div>
          {incident.relatedCodeChunks.map((chunk) => (
            <details key={chunk._id}>
              <summary>{chunk.filePath}</summary>
              <pre>{chunk.content}</pre>
            </details>
          ))}
        </div>
        <div className="panel">
          <div className="panel-title">
            <Brain size={18} />
            <h2>Similar Incidents</h2>
          </div>
          {incident.similarIncidents.map((memory) => (
            <p key={memory._id}>
              <strong>{memory.title}</strong><br />
              {memory.rootCause}<br />
              Outcome: {memory.outcome ?? "unknown"}<br />
              Fixes: {(memory.suggestedFixes ?? []).join(", ") || "unknown"}
            </p>
          ))}
        </div>
      </div>

      <div className="panel log-panel">
        <div className="panel-title">
          <ScrollText size={18} />
          <h2>Relevant Logs</h2>
        </div>
        {incident.logs.map((log) => (
          <code className="log-line" key={log._id}>
            [{new Date(log.timestamp).toLocaleString()}] {log.level} {log.service}: {log.message}
          </code>
        ))}
      </div>
    </section>
  );
}
