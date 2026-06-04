import type mongoose from "mongoose";
import { createEmbedding } from "../embeddings/embeddingService.js";
import { searchCodeChunks, searchIncidentMemories } from "../embeddings/searchService.js";
import { LogEntryModel } from "../logs/LogEntry.js";
import { IncidentModel, type IncidentDocument } from "../incidents/Incident.js";
import { IncidentMemoryModel } from "../incidents/IncidentMemory.js";
import { getLatestRepositoryId } from "../services/repositoryIndexer.js";
import { generateText } from "./llmService.js";
import type { RootCauseAnalysis } from "../types/analysis.js";

function parseAnalysis(text: string): RootCauseAnalysis {
  const fallback: RootCauseAnalysis = {
    whatHappened: "DebugPilot detected repeated failures in a short time window.",
    likelyRootCause: "The exact cause is unclear from the available context.",
    filesToInspect: [],
    suggestedFixes: ["Inspect the first error, recent deploys, and service dependencies."],
    confidenceScore: 0.4
  };

  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text) as Partial<RootCauseAnalysis>;
    return {
      whatHappened: parsed.whatHappened ?? fallback.whatHappened,
      likelyRootCause: parsed.likelyRootCause ?? fallback.likelyRootCause,
      filesToInspect: Array.isArray(parsed.filesToInspect) ? parsed.filesToInspect : [],
      suggestedFixes: Array.isArray(parsed.suggestedFixes) ? parsed.suggestedFixes : fallback.suggestedFixes,
      confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : fallback.confidenceScore
    };
  } catch {
    return fallback;
  }
}

export async function runRootCauseAnalysis(incident: IncidentDocument) {
  const logs = await LogEntryModel.find({ _id: { $in: incident.logIds } })
    .sort({ timestamp: 1 })
    .limit(50);

  const logContext = logs
    .map((log) => `[${log.timestamp.toISOString()}] ${log.level} ${log.service}: ${log.message}`)
    .join("\n");

  const query = `${incident.service} ${incident.fingerprint}\n${logContext}`;
  const embedding = await createEmbedding(query);
  const repoId = await getLatestRepositoryId();
  const [similarIncidents, codeChunks] = await Promise.all([
    searchIncidentMemories(embedding, 5),
    searchCodeChunks(embedding, repoId, 8)
  ]);

  const prompt = `
You are DebugPilot, an AI engineer and SRE assistant. Analyze this production incident.

Return JSON only with:
{
  "whatHappened": "short explanation",
  "likelyRootCause": "most likely cause",
  "filesToInspect": ["file paths"],
  "suggestedFixes": ["fix ideas"],
  "confidenceScore": 0.0
}

Incident:
Service: ${incident.service}
Fingerprint: ${incident.fingerprint}
Occurrences: ${incident.occurrenceCount}

Logs:
${logContext}

Similar past incidents:
${similarIncidents.map((memory) => `- ${memory.title}: ${memory.rootCause}`).join("\n") || "None"}

Relevant code chunks:
${codeChunks.map((chunk) => `FILE: ${chunk.filePath}\n${chunk.content}`).join("\n\n---\n\n") || "No indexed code found"}
`.trim();

  const analysisText = await generateText(prompt);
  const analysis = parseAnalysis(analysisText);
  const relatedCodeChunkIds = codeChunks.map((chunk) => chunk._id as mongoose.Types.ObjectId);
  const similarIncidentIds = similarIncidents.map((memory) => memory._id as mongoose.Types.ObjectId);

  await IncidentModel.updateOne(
    { _id: incident._id },
    {
      $set: {
        analysis,
        relatedCodeChunks: relatedCodeChunkIds,
        similarIncidentIds
      }
    }
  );

  const memoryText = `${incident.title}\n${analysis.whatHappened}\n${analysis.likelyRootCause}`;
  await IncidentMemoryModel.updateOne(
    { incidentId: incident._id },
    {
      $set: {
        incidentId: incident._id,
        title: incident.title,
        summary: analysis.whatHappened,
        rootCause: analysis.likelyRootCause,
        embedding: await createEmbedding(memoryText),
        timestamp: new Date()
      }
    },
    { upsert: true }
  );

  return analysis;
}
