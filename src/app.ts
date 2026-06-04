import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { repositoryRoutes } from "./api/repositoryRoutes.js";
import { logRoutes } from "./api/logRoutes.js";
import { incidentRoutes } from "./api/incidentRoutes.js";
import { alertRoutes } from "./api/alertRoutes.js";
import { serviceRoutes } from "./api/serviceRoutes.js";
import { askRoutes } from "./api/askRoutes.js";
import { healthRoutes } from "./api/healthRoutes.js";
import { deploymentRoutes } from "./api/deploymentRoutes.js";
import { metricRoutes } from "./api/metricRoutes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.use("/health", healthRoutes);
  app.use("/repositories", repositoryRoutes);
  app.use("/logs", logRoutes);
  app.use("/incidents", incidentRoutes);
  app.use("/alerts", alertRoutes);
  app.use("/services", serviceRoutes);
  app.use("/deployments", deploymentRoutes);
  app.use("/metrics", metricRoutes);
  app.use("/ask", askRoutes);

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "Invalid request", details: error.flatten() });
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[debugpilot] request failed", error);
    response.status(500).json({ error: message });
  });

  return app;
}
