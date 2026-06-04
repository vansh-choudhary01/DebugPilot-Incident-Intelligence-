import { connectDatabase } from "../src/config/database.js";
import { ingestLog } from "../src/logs/logService.js";
import mongoose from "mongoose";
import { DeploymentModel } from "../src/deployments/Deployment.js";
import { MetricModel } from "../src/metrics/Metric.js";

async function main() {
  await connectDatabase();

  const baseTime = Date.now() - 4 * 60 * 1000;

  await DeploymentModel.create({
    service: "payment-service",
    commit: "abc123",
    author: "demo-user",
    timestamp: new Date(baseTime - 5 * 60 * 1000)
  });

  for (let index = 0; index < 16; index += 1) {
    const incidentRamp = index > 8 ? index - 8 : 0;

    await MetricModel.create({
      service: "payment-service",
      cpuUsage: 42 + incidentRamp * 6,
      memoryUsage: 520 + incidentRamp * 45,
      requestCount: 1100 + index * 18,
      errorRate: 1.4 + incidentRamp * 1.2,
      avgLatency: 180 + incidentRamp * 70,
      timestamp: new Date(baseTime - 60 * 60 * 1000 + index * 4 * 60 * 1000)
    });
  }

  for (let index = 0; index < 12; index += 1) {
    await MetricModel.create({
      service: "api-gateway",
      cpuUsage: 35 + index,
      memoryUsage: 420 + index * 8,
      requestCount: 2400 + index * 25,
      errorRate: index > 8 ? 2.1 : 0.6,
      avgLatency: index > 8 ? 210 : 95,
      timestamp: new Date(baseTime - 45 * 60 * 1000 + index * 5 * 60 * 1000)
    });
  }

  for (let index = 0; index < 22; index += 1) {
    await ingestLog({
      service: "payment-service",
      level: "error",
      message: "Payment checkout failed because database connection pool timed out",
      metadata: {
        route: "/checkout",
        requestId: `demo-${index}`
      },
      timestamp: new Date(baseTime + index * 8000)
    });
  }

  for (let index = 0; index < 8; index += 1) {
    await ingestLog({
      service: "api-gateway",
      level: index % 3 === 0 ? "warn" : "info",
      message: index % 3 === 0 ? "Request latency above p95" : "Request completed",
      metadata: { route: "/health" },
      timestamp: new Date(baseTime + index * 12000)
    });
  }

  await mongoose.disconnect();
  console.log("[debugpilot] seeded demo logs and generated an incident");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
