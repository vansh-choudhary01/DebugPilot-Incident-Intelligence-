import { Router } from "express";
import { z } from "zod";
import { MetricModel } from "../metrics/Metric.js";

export const metricRoutes = Router();

const metricSchema = z.object({
  service: z.string().min(1),
  cpuUsage: z.number().min(0),
  memoryUsage: z.number().min(0),
  requestCount: z.number().min(0),
  errorRate: z.number().min(0),
  avgLatency: z.number().min(0),
  timestamp: z.coerce.date()
});

metricRoutes.post("/", async (request, response, next) => {
  try {
    const payload = metricSchema.parse(request.body);
    const metric = await MetricModel.create(payload);
    response.status(201).json(metric);
  } catch (error) {
    next(error);
  }
});

metricRoutes.get("/", async (request, response) => {
  const service = typeof request.query.service === "string" ? request.query.service : undefined;
  const metrics = await MetricModel.find(service ? { service } : {})
    .sort({ timestamp: -1 })
    .limit(300);
  response.json(metrics);
});

metricRoutes.get("/summary", async (_request, response) => {
  const services = await MetricModel.distinct("service");
  const summaries = await Promise.all(
    services.map(async (service) => {
      const recentMetrics = await MetricModel.find({ service }).sort({ timestamp: -1 }).limit(24);
      const orderedMetrics = recentMetrics.reverse();
      const latest = orderedMetrics.at(-1);
      const peaks = {
        cpuUsage: Math.max(...orderedMetrics.map((metric) => metric.cpuUsage), 0),
        memoryUsage: Math.max(...orderedMetrics.map((metric) => metric.memoryUsage), 0),
        errorRate: Math.max(...orderedMetrics.map((metric) => metric.errorRate), 0),
        avgLatency: Math.max(...orderedMetrics.map((metric) => metric.avgLatency), 0)
      };

      return {
        service,
        latest,
        peaks,
        trends: {
          avgLatency: orderedMetrics.map((metric) => ({
            timestamp: metric.timestamp,
            value: metric.avgLatency
          })),
          errorRate: orderedMetrics.map((metric) => ({
            timestamp: metric.timestamp,
            value: metric.errorRate
          })),
          memoryUsage: orderedMetrics.map((metric) => ({
            timestamp: metric.timestamp,
            value: metric.memoryUsage
          })),
          cpuUsage: orderedMetrics.map((metric) => ({
            timestamp: metric.timestamp,
            value: metric.cpuUsage
          }))
        }
      };
    })
  );

  response.json(summaries);
});
