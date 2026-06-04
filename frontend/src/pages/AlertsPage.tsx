import { useEffect, useState } from "react";
import { apiGet, type Alert } from "../api/client.js";
import { EmptyState } from "../components/EmptyState.js";
import { StatusPill } from "../components/StatusPill.js";

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    void apiGet<Alert[]>("/alerts").then(setAlerts);
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Alerts</h1>
          <p>Console and webhook notifications sent for incidents.</p>
        </div>
      </header>

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
