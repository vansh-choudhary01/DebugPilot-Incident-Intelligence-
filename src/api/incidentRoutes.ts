import { Router } from "express";
import { IncidentModel } from "../incidents/Incident.js";
import { LogEntryModel } from "../logs/LogEntry.js";
import { CodeChunkModel } from "../embeddings/CodeChunk.js";
import { IncidentMemoryModel } from "../incidents/IncidentMemory.js";

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

  const [logs, relatedCodeChunks, similarIncidents] = await Promise.all([
    LogEntryModel.find({ _id: { $in: incident.logIds } }).sort({ timestamp: 1 }).limit(100),
    CodeChunkModel.find({ _id: { $in: incident.relatedCodeChunks } }),
    IncidentMemoryModel.find({ _id: { $in: incident.similarIncidentIds } })
  ]);

  response.json({
    ...incident.toObject(),
    logs,
    relatedCodeChunks,
    similarIncidents
  });
});

incidentRoutes.post("/:id/resolve", async (request, response) => {
  const incident = await IncidentModel.findByIdAndUpdate(
    request.params.id,
    { status: "resolved" },
    { new: true }
  );

  if (!incident) {
    response.status(404).json({ error: "Incident not found" });
    return;
  }

  response.json(incident);
});
