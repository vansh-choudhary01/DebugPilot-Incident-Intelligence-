import { Router } from "express";
import { IncidentModel } from "../incidents/Incident.js";
import { LogEntryModel } from "../logs/LogEntry.js";
import { CodeChunkModel } from "../embeddings/CodeChunk.js";
import { IncidentMemoryModel } from "../incidents/IncidentMemory.js";
import { DeploymentModel } from "../deployments/Deployment.js";
import { enqueueRcaJob } from "../jobs/rcaQueue.js";

export const incidentRoutes = Router();

incidentRoutes.get("/", async (_request, response) => {
  const incidents = await IncidentModel.find().sort({ createdAt: -1 }).limit(100);
  response.json(incidents);
});

incidentRoutes.get("/:id", async (request, response) => {
  const incident = await IncidentModel.findById(request.params.id);

  if (!incident) {
    response.status(404).json({ error: "Incident not found" });
    return;
  }

  const [logs, relatedCodeChunks, similarIncidents, relatedDeployments] = await Promise.all([
    LogEntryModel.find({ _id: { $in: incident.logIds } }).sort({ timestamp: 1 }).limit(100),
    CodeChunkModel.find({ _id: { $in: incident.relatedCodeChunks ?? [] } }),
    IncidentMemoryModel.find({ _id: { $in: incident.similarIncidentIds ?? [] } }),
    DeploymentModel.find({ _id: { $in: incident.relatedDeploymentIds ?? [] } }).sort({ timestamp: -1 })
  ]);

  response.json({
    ...incident.toObject(),
    logs,
    relatedCodeChunks,
    similarIncidents,
    relatedDeployments
  });
});

incidentRoutes.post("/:id/resolve", async (request, response) => {
  const outcome =
    typeof request.body?.outcome === "string" && request.body.outcome.trim().length > 0
      ? request.body.outcome.trim()
      : "resolved";

  const incident = await IncidentModel.findByIdAndUpdate(
    request.params.id,
    { status: "resolved" },
    { new: true }
  );

  if (!incident) {
    response.status(404).json({ error: "Incident not found" });
    return;
  }

  await IncidentMemoryModel.updateOne({ incidentId: incident._id }, { $set: { outcome } });
  response.json(incident);
});

incidentRoutes.post("/:id/reanalyze", async (request, response) => {
  const incident = await IncidentModel.findByIdAndUpdate(
    request.params.id,
    {
      $unset: { analysis: "" },
      $set: {
        relatedCodeChunks: [],
        similarIncidentIds: [],
        relatedDeploymentIds: []
      }
    },
    { new: true }
  );

  if (!incident) {
    response.status(404).json({ error: "Incident not found" });
    return;
  }

  await enqueueRcaJob(incident._id.toString());
  response.json({ queued: true, incidentId: incident._id });
});
