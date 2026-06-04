import { Router } from "express";
import { LogEntryModel } from "../logs/LogEntry.js";
import { ingestLog } from "../logs/logService.js";

export const logRoutes = Router();

logRoutes.get("/", async (request, response) => {
  const service = typeof request.query.service === "string" ? request.query.service : undefined;
  const query = service ? { service } : {};
  const logs = await LogEntryModel.find(query).sort({ timestamp: -1 }).limit(200);
  response.json(logs);
});

logRoutes.post("/", async (request, response, next) => {
  try {
    const log = await ingestLog(request.body);
    response.status(201).json(log);
  } catch (error) {
    next(error);
  }
});
