import { Activity, AlertTriangle, GitBranch, RefreshCw, Server } from "lucide-react";
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

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Services</h1>
          <p>Operational health from logs, metrics, deployments, and RCA jobs.</p>
        </div>
      </header>

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
              <span>{repo.codeChunkCount ?? 0} chunks indexed</span>
            </div>
            <StatusPill label={repo.status} tone={repo.status === "indexed" ? "good" : "warn"} />
            <button className="icon-button" onClick={() => reindex(repo._id)} title="Re-index repository">
              <RefreshCw size={16} />
            </button>
          </div>
        ))}
      </div>

      {metricSummaries.length > 0 && (
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
      )}

      {services.length === 0 ? (
        <EmptyState message="No logs ingested yet." />
      ) : (
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
                  <td>{service.service}</td>
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
      )}
    </section>
  );
}
