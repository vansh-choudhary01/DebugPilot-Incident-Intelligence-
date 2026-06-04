import type mongoose from "mongoose";
import { CodeChunkModel, type CodeChunkDocument } from "./CodeChunk.js";
import { IncidentMemoryModel, type IncidentMemoryDocument } from "../incidents/IncidentMemory.js";
import { cosineSimilarity } from "./vectorMath.js";

type Scored<T> = T & { score?: number };

function isDocumentationPath(filePath: string) {
  return /(^|[/\\])readme\.md$/i.test(filePath) || /\.(md|mdx)$/i.test(filePath);
}

const ignoredSearchTerms = new Set([
  "error",
  "failed",
  "failure",
  "service",
  "within",
  "received",
  "detected",
  "threshold",
  "component",
  "route",
  "post",
  "metadata"
]);

function searchTerms(context: string) {
  const words = context
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !ignoredSearchTerms.has(word));

  return [...new Set(words)].slice(0, 30);
}

function keywordScore(chunk: CodeChunkDocument, terms: string[]) {
  const path = chunk.filePath.toLowerCase();
  const content = chunk.content.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (path.includes(term)) {
      score += 0.18;
    }

    if (content.includes(term)) {
      score += 0.04;
    }
  }

  if (/\b(src|controllers|utils|store|services|routes)\b/i.test(chunk.filePath)) {
    score += 0.12;
  }

  return score;
}

export async function searchCodeChunks(
  embedding: number[],
  repoId?: mongoose.Types.ObjectId,
  limit = 6
): Promise<Array<Scored<CodeChunkDocument>>> {
  const filter = repoId ? { repoId } : {};

  try {
    const results = await CodeChunkModel.aggregate([
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

    return results.filter((chunk) => !isDocumentationPath(chunk.filePath));
  } catch {
    const chunks = await CodeChunkModel.find(filter).limit(500);
    return chunks
      .filter((chunk) => !isDocumentationPath(chunk.filePath))
      .map((chunk) => ({ ...chunk.toObject(), score: cosineSimilarity(embedding, chunk.embedding) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit) as Array<Scored<CodeChunkDocument>>;
  }
}

export async function searchIncidentCodeChunks(
  embedding: number[],
  context: string,
  repoId?: mongoose.Types.ObjectId,
  limit = 8
): Promise<Array<Scored<CodeChunkDocument>>> {
  const terms = searchTerms(context);
  const filter = repoId ? { repoId } : {};
  const chunks = await CodeChunkModel.find(filter).limit(1200);

  return chunks
    .filter((chunk) => !isDocumentationPath(chunk.filePath))
    .map((chunk) => ({
      ...chunk.toObject(),
      score: cosineSimilarity(embedding, chunk.embedding) + keywordScore(chunk, terms)
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit) as Array<Scored<CodeChunkDocument>>;
}

function serviceTerms(service: string) {
  const pieces = service
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((piece) => piece.length > 2 && piece !== "service");

  return [...new Set([service.toLowerCase(), ...pieces])];
}

export async function searchServiceCodeChunks(
  embedding: number[],
  service: string,
  repoId?: mongoose.Types.ObjectId,
  limit = 8,
  allowFallback = true
): Promise<Array<Scored<CodeChunkDocument>>> {
  const terms = serviceTerms(service);
  if (terms.length === 0) {
    return searchCodeChunks(embedding, repoId, limit);
  }

  const regexes = terms.map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  const filter = {
    ...(repoId ? { repoId } : {}),
    $or: [
      ...regexes.map((regex) => ({ filePath: regex })),
      ...regexes.map((regex) => ({ content: regex }))
    ]
  };

  const serviceChunks = await CodeChunkModel.find(filter).limit(500);
  const ranked = serviceChunks
    .filter((chunk) => !isDocumentationPath(chunk.filePath))
    .map((chunk) => ({ ...chunk.toObject(), score: cosineSimilarity(embedding, chunk.embedding) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit) as Array<Scored<CodeChunkDocument>>;

  if (ranked.length >= Math.min(3, limit) || !allowFallback) {
    return ranked;
  }

  const fallback = await searchCodeChunks(embedding, repoId, limit);
  const seen = new Set(ranked.map((chunk) => chunk._id.toString()));

  return [
    ...ranked,
    ...fallback.filter((chunk) => !seen.has(chunk._id.toString()))
  ].slice(0, limit);
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
