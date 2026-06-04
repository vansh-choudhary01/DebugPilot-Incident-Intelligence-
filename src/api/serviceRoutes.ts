import { Router } from "express";
import { LogEntryModel } from "../logs/LogEntry.js";
import { IncidentModel } from "../incidents/Incident.js";

export const serviceRoutes = Router();

serviceRoutes.get("/", async (_request, response) => {
  const services = await LogEntryModel.aggregate([
    {
      $group: {
        _id: "$service",
        totalLogs: { $sum: 1 },
        errorCount: {
          $sum: {
            $cond: [{ $in: ["$level", ["error", "fatal"]] }, 1, 0]
          }
        },
        lastLogAt: { $max: "$timestamp" }
      }
    },
    { $sort: { errorCount: -1, totalLogs: -1 } }
  ]);

  const openIncidentCounts = await IncidentModel.aggregate([
    { $match: { status: "open" } },
    { $group: { _id: "$service", openIncidents: { $sum: 1 } } }
  ]);

  const incidentsByService = new Map(openIncidentCounts.map((item) => [item._id, item.openIncidents]));

  response.json(
    services.map((service) => ({
      service: service._id,
      totalLogs: service.totalLogs,
      errorCount: service.errorCount,
      openIncidents: incidentsByService.get(service._id) ?? 0,
      lastLogAt: service.lastLogAt,
      health: incidentsByService.has(service._id) ? "degraded" : "healthy"
    }))
  );
});
