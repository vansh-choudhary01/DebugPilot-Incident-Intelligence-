import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/debugpilot",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  aiProvider: (process.env.AI_PROVIDER ?? "mock").toLowerCase(),
  openAiApiKey: process.env.OPENAI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 768),
  webhookUrl: process.env.WEBHOOK_URL,
  repositoryBasePath: process.env.REPOSITORY_BASE_PATH ?? "./repos"
};
