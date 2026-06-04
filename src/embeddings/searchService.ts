import type mongoose from "mongoose";
import { CodeChunkModel, type CodeChunkDocument } from "./CodeChunk.js";
import { IncidentMemoryModel, type IncidentMemoryDocument } from "../incidents/IncidentMemory.js";
import { cosineSimilarity } from "./vectorMath.js";

type Scored<T> = T & { score?: number };

export async function searchCodeChunks(
  embedding: number[],
  repoId?: mongoose.Types.ObjectId,
  limit = 6
): Promise<Array<Scored<CodeChunkDocument>>> {
  const filter = repoId ? { repoId } : {};

  try {
    return await CodeChunkModel.aggregate([
      {
        $vectorSearch: {
          index: "code_embedding_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 100,
          limit,
          filter
        }
      },
      { $addFields: { score: { $meta: "vectorSearchScore" } } }
    ]);
  } catch {
    const chunks = await CodeChunkModel.find(filter).limit(500);
    return chunks
      .map((chunk) => ({ ...chunk.toObject(), score: cosineSimilarity(embedding, chunk.embedding) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit) as Array<Scored<CodeChunkDocument>>;
  }
}

export async function searchIncidentMemories(
  embedding: number[],
  limit = 5
): Promise<Array<Scored<IncidentMemoryDocument>>> {
  try {
    return await IncidentMemoryModel.aggregate([
      {
        $vectorSearch: {
          index: "incident_memory_embedding_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 100,
          limit
        }
      },
      { $addFields: { score: { $meta: "vectorSearchScore" } } }
    ]);
  } catch {
    const memories = await IncidentMemoryModel.find().sort({ timestamp: -1 }).limit(500);
    return memories
      .map((memory) => ({ ...memory.toObject(), score: cosineSimilarity(embedding, memory.embedding) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit) as Array<Scored<IncidentMemoryDocument>>;
  }
}
