import { GitBranch, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost, type Repository, type ServiceHealth } from "../api/client.js";
import { EmptyState } from "../components/EmptyState.js";
import { StatusPill } from "../components/StatusPill.js";

export function ServicesPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [serviceData, repoData] = await Promise.all([
      apiGet<ServiceHealth[]>("/services"),
      apiGet<Repository[]>("/repositories")
    ]);
    setServices(serviceData);
    setRepositories(repoData);
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

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Services</h1>
          <p>Live service health from ingested application logs.</p>
        </div>
      </header>

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
