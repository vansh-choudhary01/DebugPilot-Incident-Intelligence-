import { connectDatabase } from "./config/database.js";
import { startRcaWorker } from "./jobs/rcaWorker.js";

async function main() {
  await connectDatabase();
  startRcaWorker();
  console.log("[debugpilot worker] RCA worker is running");
}

main().catch((error) => {
  console.error("[debugpilot worker] failed to start", error);
  process.exit(1);
});
