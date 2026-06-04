import { env } from "../config/env.js";
import { AlertModel } from "./Alert.js";
import type { IncidentDocument } from "../incidents/Incident.js";

export async function sendIncidentAlert(incident: IncidentDocument) {
  const message = `${incident.service} experiencing repeated ${incident.fingerprint.replaceAll("_", " ")} failures.`;

  console.warn(`[debugpilot alert] ${message}`);
  await AlertModel.create({
    incidentId: incident._id,
    service: incident.service,
    message,
    channel: "console",
    status: "sent"
  });

  if (!env.webhookUrl) {
    return;
  }

  try {
    await fetch(env.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId: incident._id, service: incident.service, message })
    });

    await AlertModel.create({
      incidentId: incident._id,
      service: incident.service,
      message,
      channel: "webhook",
      status: "sent"
    });
  } catch {
    await AlertModel.create({
      incidentId: incident._id,
      service: incident.service,
      message,
      channel: "webhook",
      status: "failed"
    });
  }
}
