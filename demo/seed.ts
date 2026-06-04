import { connectDatabase } from "../src/config/database.js";
import { ingestLog } from "../src/logs/logService.js";
import mongoose from "mongoose";

async function main() {
  await connectDatabase();

  const baseTime = Date.now() - 4 * 60 * 1000;

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
