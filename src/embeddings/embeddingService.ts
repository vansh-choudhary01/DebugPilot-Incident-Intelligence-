import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { fitDimensions } from "./vectorMath.js";

const openai = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : undefined;
const gemini = env.geminiApiKey ? new GoogleGenerativeAI(env.geminiApiKey) : undefined;

function mockEmbedding(text: string) {
  const vector = Array.from({ length: env.embeddingDimensions }, () => 0);
  const words = text.toLowerCase().match(/[a-z0-9_./-]+/g) ?? [];

  for (const word of words) {
    const hash = createHash("sha256").update(word).digest();
    const slot = hash.readUInt32BE(0) % env.embeddingDimensions;
    vector[slot] += 1;
  }

  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / length);
}

export async function createEmbedding(text: string) {
  if (env.aiProvider === "openai" && openai) {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
      dimensions: env.embeddingDimensions
    });

    return fitDimensions(response.data[0].embedding, env.embeddingDimensions);
  }

  if (env.aiProvider === "gemini" && gemini) {
    const model = gemini.getGenerativeModel({ model: env.geminiEmbeddingModel });
    const response = await model.embedContent(text.slice(0, 8000));
    return fitDimensions(response.embedding.values, env.embeddingDimensions);
  }

  return mockEmbedding(text);
}
