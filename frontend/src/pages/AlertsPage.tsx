import { Bell, CheckCircle, RadioTower, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { apiGet, type Alert } from "../api/client.js";
import { EmptyState } from "../components/EmptyState.js";
import { StatusPill } from "../components/StatusPill.js";

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    void apiGet<Alert[]>("/alerts").then(setAlerts);
  }, []);

  const sentCount = alerts.filter((alert) => alert.status === "sent").length;
  const failedCount = alerts.filter((alert) => alert.status === "failed").length;
  const webhookCount = alerts.filter((alert) => alert.channel === "webhook").length;

  return (
    <section className="dashboard-page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Alerts</span>
          <h1>Incident notification audit</h1>
          <p>Console and webhook notifications generated from incident updates.</p>
        </div>
      </header>

      <div className="summary-grid">
        <div className="summary-card">
          <Bell size={18} />
          <span>Total alerts</span>
          <strong>{alerts.length}</strong>
        </div>
        <div className="summary-card">
          <CheckCircle size={18} />
          <span>Sent</span>
          <strong>{sentCount}</strong>
        </div>
        <div className="summary-card">
          <XCircle size={18} />
          <span>Failed</span>
          <strong>{failedCount}</strong>
        </div>
        <div className="summary-card">
          <RadioTower size={18} />
          <span>Webhooks</span>
          <strong>{webhookCount}</strong>
        </div>
      </div>

      {alerts.length === 0 ? (
        <EmptyState message="No alerts sent yet." />
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Message</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert._id}>
                  <td>{alert.service}</td>
                  <td>{alert.message}</td>
                  <td>{alert.channel}</td>
                  <td><StatusPill label={alert.status} tone={alert.status === "sent" ? "good" : "bad"} /></td>
                  <td>{new Date(alert.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
