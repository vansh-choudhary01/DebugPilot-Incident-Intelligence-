import { createEmbedding } from "../embeddings/embeddingService.js";
import { searchCodeChunks, searchIncidentMemories } from "../embeddings/searchService.js";
import { LogEntryModel } from "../logs/LogEntry.js";
import { IncidentModel } from "../incidents/Incident.js";
import { getLatestRepositoryId } from "./repositoryIndexer.js";
import { generateText } from "../agents/llmService.js";

export async function answerQuestion(question: string) {
  const embedding = await createEmbedding(question);
  const repoId = await getLatestRepositoryId();
  const [memories, codeChunks, recentLogs, openIncidents] = await Promise.all([
    searchIncidentMemories(embedding, 5),
    searchCodeChunks(embedding, repoId, 6),
    LogEntryModel.find().sort({ timestamp: -1 }).limit(25),
    IncidentModel.find({ status: "open" }).sort({ createdAt: -1 }).limit(10)
  ]);

  const prompt = `
You are DebugPilot. Answer the developer's debugging question using logs, incident memory, and indexed code.
Be concise and practical. Point to files when possible.

Question:
${question}

Open incidents:
${openIncidents.map((incident) => `- ${incident.title}: ${incident.analysis?.likelyRootCause ?? "analysis pending"}`).join("\n") || "None"}

Recent logs:
${recentLogs.map((log) => `[${log.timestamp.toISOString()}] ${log.level} ${log.service}: ${log.message}`).join("\n")}

Similar incident memory:
${memories.map((memory) => `- ${memory.title}: ${memory.rootCause}`).join("\n") || "None"}

Related code:
${codeChunks.map((chunk) => `FILE: ${chunk.filePath}\n${chunk.content}`).join("\n\n---\n\n") || "No code chunks found"}
`.trim();

  const answer = await generateText(prompt);

  return {
    answer,
    similarIncidents: memories,
    relatedCode: codeChunks.map((chunk) => ({
      filePath: chunk.filePath,
      score: chunk.score
    }))
  };
}
