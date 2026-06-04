import Redis from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true
});

export async function connectRedis() {
  try {
    await redis.connect();
    console.log("[debugpilot] connected to Redis");
  } catch (error) {
    console.warn("[debugpilot] Redis unavailable; continuing without cache");
  }
}
