import { createEmbedding } from "../embeddings/embeddingService.js";
import { searchIncidentMemories, searchServiceCodeChunks } from "../embeddings/searchService.js";
import { LogEntryModel } from "../logs/LogEntry.js";
import { IncidentModel } from "../incidents/Incident.js";
import { getLatestRepositoryId, getRepositoryIdForService } from "./repositoryIndexer.js";
import { generateText } from "../agents/llmService.js";

function serviceTerms(service: string) {
  return service
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && term !== "service");
}

function textMentionsService(text: string, service: string) {
  const lowerText = text.toLowerCase();
  const terms = serviceTerms(service);

  return lowerText.includes(service.toLowerCase()) || terms.some((term) => lowerText.includes(term));
}

async function resolveQuestionService(question: string) {
  const [openIncidents, logServices] = await Promise.all([
    IncidentModel.find({ status: "open" }).sort({ createdAt: -1 }).limit(25),
    LogEntryModel.distinct("service")
  ]);

  const knownServices = [...new Set([...openIncidents.map((incident) => incident.service), ...logServices])];
  const explicitService = knownServices.find((service) => textMentionsService(question, service));

  if (explicitService) {
    return explicitService;
  }

  const questionTerms = question.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
  const matchingIncident = openIncidents.find((incident) => {
    const searchable = `${incident.title} ${incident.fingerprint} ${incident.analysis?.likelyRootCause ?? ""}`.toLowerCase();
    return questionTerms.some((term) => term.length > 3 && searchable.includes(term));
  });

  if (matchingIncident) {
    return matchingIncident.service;
  }

  return openIncidents.length === 1 ? openIncidents[0].service : undefined;
}

export async function answerQuestion(question: string) {
  const embedding = await createEmbedding(question);
  const focusedService = await resolveQuestionService(question);
  const repoId = focusedService ? await getRepositoryIdForService(focusedService) : await getLatestRepositoryId();
  const scopedQuery = focusedService ? { service: focusedService } : {};
  const [memories, codeChunks, recentLogs, openIncidents] = await Promise.all([
    searchIncidentMemories(embedding, 8),
    focusedService
      ? searchServiceCodeChunks(embedding, focusedService, repoId, 6, false)
      : searchServiceCodeChunks(embedding, question, repoId, 6, false),
    LogEntryModel.find(scopedQuery).sort({ timestamp: -1 }).limit(25),
    IncidentModel.find({ status: "open", ...scopedQuery }).sort({ createdAt: -1 }).limit(10)
  ]);
  const scopedMemories = focusedService
    ? memories.filter((memory) => textMentionsService(`${memory.title} ${memory.summary} ${memory.rootCause}`, focusedService))
    : memories;

  const prompt = `
You are DebugPilot. Answer the developer's debugging question using logs, incident memory, and indexed code.
Be concise and practical. Point to files when possible.
${focusedService ? `The question is scoped to service "${focusedService}". Do not use incidents, logs, or files from another service.` : "If the service is ambiguous, say which service you are using and avoid guessing across unrelated services."}

Question:
${question}

Open incidents:
${openIncidents.map((incident) => `- ${incident.title}: ${incident.analysis?.likelyRootCause ?? "analysis pending"}`).join("\n") || "None"}

Recent logs:
${recentLogs.map((log) => `[${log.timestamp.toISOString()}] ${log.level} ${log.service}: ${log.message}`).join("\n")}

Similar incident memory:
${scopedMemories.map((memory) => `- ${memory.title}: ${memory.rootCause}. Fixes: ${(memory.suggestedFixes ?? []).join(", ") || "unknown"}. Outcome: ${memory.outcome ?? "unknown"}`).join("\n") || "None"}

Related code:
${codeChunks.map((chunk) => `FILE: ${chunk.filePath}\n${chunk.content}`).join("\n\n---\n\n") || "No code chunks found"}
`.trim();

  const answer = await generateText(prompt);

  return {
    answer,
    focusedService,
    similarIncidents: scopedMemories,
    relatedCode: codeChunks.map((chunk) => ({
      filePath: chunk.filePath,
      score: chunk.score
    }))
  };
}
