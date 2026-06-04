import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import { env } from "./config/env.js";

async function main() {
  await connectDatabase();
  await connectRedis();

  const app = createApp();
  app.listen(env.port, "0.0.0.0", () => {
    console.log(`[debugpilot] backend listening on http://localhost:${env.port}`);
  });
}

main().catch((error) => {
  console.error("[debugpilot] failed to start", error);
  process.exit(1);
});
