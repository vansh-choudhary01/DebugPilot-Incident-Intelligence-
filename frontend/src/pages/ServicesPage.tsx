import { Activity, AlertTriangle, Brain, Code2, Database, GitBranch, RefreshCw, Server } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost, type MetricSummary, type Repository, type ServiceHealth } from "../api/client.js";
import { EmptyState } from "../components/EmptyState.js";
import { Sparkline } from "../components/Sparkline.js";
import { StatusPill } from "../components/StatusPill.js";

export function ServicesPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [metricSummaries, setMetricSummaries] = useState<MetricSummary[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [serviceData, repoData, metricData] = await Promise.all([
      apiGet<ServiceHealth[]>("/services"),
      apiGet<Repository[]>("/repositories"),
      apiGet<MetricSummary[]>("/metrics/summary")
    ]);
    setServices(serviceData);
    setRepositories(repoData);
    setMetricSummaries(metricData);
  }

  useEffect(() => {
    void load();
  }, []);

  async function connectRepository(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await apiPost<Repository>("/repositories", { url: repoUrl });
    setRepoUrl("");
    setLoading(false);
    await load();
  }

  async function reindex(id: string) {
    setLoading(true);
    await apiPost<Repository>(`/repositories/${id}/reindex`);
    setLoading(false);
    await load();
  }

  const totalErrors = services.reduce((sum, service) => sum + service.errorCount, 0);
  const openIncidents = services.reduce((sum, service) => sum + service.openIncidents, 0);
  const degradedServices = services.filter((service) => service.health === "degraded").length;
  const indexedChunks = repositories.reduce((sum, repo) => sum + (repo.codeChunkCount ?? 0), 0);
  const indexedRepositories = repositories.filter((repo) => repo.status === "indexed").length;

  return (
    <section className="dashboard-page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Dashboard</span>
          <h1>Service context cockpit</h1>
          <p>Operational health tied to logs, metrics, repository context, incident memory, and RCA jobs.</p>
        </div>
      </header>

      <div className="dashboard-hero">
        <div>
          <span className="page-eyebrow">Context pipeline</span>
          <h2>DebugPilot connects the signals before it explains the failure.</h2>
          <p>
            Each service card is backed by ingested logs, metric trends, indexed source chunks,
            incident fingerprints, and saved RCA memory.
          </p>
        </div>
        <div className="context-chain" aria-label="DebugPilot context sources">
          <div><Activity size={16} /><span>Logs</span></div>
          <div><Database size={16} /><span>Metrics</span></div>
          <div><Code2 size={16} /><span>Code</span></div>
          <div><Brain size={16} /><span>Memory</span></div>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <Server size={18} />
          <span>Services</span>
          <strong>{services.length}</strong>
        </div>
        <div className="summary-card">
          <AlertTriangle size={18} />
          <span>Open incidents</span>
          <strong>{openIncidents}</strong>
        </div>
        <div className="summary-card">
          <Activity size={18} />
          <span>Errors</span>
          <strong>{totalErrors}</strong>
        </div>
        <div className="summary-card">
          <RefreshCw size={18} />
          <span>Degraded</span>
          <strong>{degradedServices}</strong>
        </div>
      </div>

      <div className="context-panel">
        <div className="section-heading">
          <div>
            <span className="page-eyebrow">Repository context</span>
            <h2>Code DebugPilot can inspect during RCA</h2>
          </div>
          <div className="context-stat">
            <strong>{indexedChunks}</strong>
            <span>chunks indexed across {indexedRepositories} repos</span>
          </div>
        </div>

        <form className="repo-form" onSubmit={connectRepository}>
          <GitBranch size={18} />
          <input
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/company/service.git"
          />
          <button type="submit" disabled={loading || repoUrl.length === 0}>Connect Repo</button>
        </form>

        <div className="repo-list">
          {repositories.map((repo) => (
            <div className="repo-row" key={repo._id}>
              <div>
                <strong>{repo.name}</strong>
                <span>{repo.codeChunkCount ?? 0} chunks indexed for semantic RCA retrieval</span>
              </div>
              <StatusPill label={repo.status} tone={repo.status === "indexed" ? "good" : "warn"} />
              <button className="icon-button" onClick={() => reindex(repo._id)} title="Re-index repository">
                <RefreshCw size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {metricSummaries.length > 0 && (
        <div className="dashboard-section">
          <div className="section-heading">
            <div>
              <span className="page-eyebrow">Metric context</span>
              <h2>Signals the RCA worker can correlate</h2>
            </div>
          </div>
          <div className="metrics-grid">
            {metricSummaries.map((summary) => (
              <div className="metric-card" key={summary.service}>
                <div className="metric-card-header">
                  <div>
                    <h2>{summary.service}</h2>
                    <span>{summary.latest ? new Date(summary.latest.timestamp).toLocaleString() : "No metrics"}</span>
                  </div>
                  <div className="metric-numbers">
                    <strong>Peak {Math.round(summary.peaks.cpuUsage)}% CPU</strong>
                    <strong>Peak {Math.round(summary.peaks.memoryUsage)}MB</strong>
                  </div>
                </div>
                <div className="metric-trends">
                  <Sparkline points={summary.trends.avgLatency} label="Latency" unit="ms" highlight={summary.peaks.avgLatency} />
                  <Sparkline points={summary.trends.errorRate} label="Error rate" unit="%" highlight={summary.peaks.errorRate} />
                  <Sparkline points={summary.trends.memoryUsage} label="Memory" unit="MB" highlight={summary.peaks.memoryUsage} />
                  <Sparkline points={summary.trends.cpuUsage} label="CPU" unit="%" highlight={summary.peaks.cpuUsage} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <EmptyState message="No logs ingested yet." />
      ) : (
        <div className="dashboard-section">
          <div className="section-heading">
            <div>
              <span className="page-eyebrow">Service health</span>
              <h2>Live services DebugPilot is watching</h2>
            </div>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Health</th>
                  <th>Errors</th>
                  <th>Logs</th>
                  <th>Open incidents</th>
                  <th>Last log</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.service}>
                    <td><strong>{service.service}</strong></td>
                    <td>
                      <StatusPill
                        label={service.health}
                        tone={service.health === "healthy" ? "good" : "bad"}
                      />
                    </td>
                    <td>{service.errorCount}</td>
                    <td>{service.totalLogs}</td>
                    <td>{service.openIncidents}</td>
                    <td>{new Date(service.lastLogAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
