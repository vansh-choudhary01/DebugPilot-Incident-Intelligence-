import { Router } from "express";
import { z } from "zod";
import { DeploymentModel } from "../deployments/Deployment.js";

export const deploymentRoutes = Router();

const deploymentSchema = z.object({
  service: z.string().min(1),
  commit: z.string().min(1),
  timestamp: z.coerce.date(),
  author: z.string().optional()
});

deploymentRoutes.get("/", async (request, response) => {
  const service = typeof request.query.service === "string" ? request.query.service : undefined;
  const deployments = await DeploymentModel.find(service ? { service } : {})
    .sort({ timestamp: -1 })
    .limit(100);
  response.json(deployments);
});

deploymentRoutes.post("/", async (request, response, next) => {
  try {
    const payload = deploymentSchema.parse(request.body);
    const deployment = await DeploymentModel.create(payload);
    response.status(201).json(deployment);
  } catch (error) {
    next(error);
  }
});
