import type mongoose from "mongoose";
import { createEmbedding } from "../embeddings/embeddingService.js";
import { searchIncidentCodeChunks, searchIncidentMemories } from "../embeddings/searchService.js";
import { LogEntryModel } from "../logs/LogEntry.js";
import { IncidentModel, type IncidentDocument } from "../incidents/Incident.js";
import { IncidentMemoryModel } from "../incidents/IncidentMemory.js";
import { getRepositoryIdForService } from "../services/repositoryIndexer.js";
import { generateText } from "./llmService.js";
import type { RootCauseAnalysis } from "../types/analysis.js";
import { DeploymentModel } from "../deployments/Deployment.js";
import { MetricModel } from "../metrics/Metric.js";

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

function metadataSearchText(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return "";
  }

  return Object.entries(metadata)
    .filter(([key]) => key !== "file" && key !== "line")
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(" ") : String(value)}`)
    .join("\n");
}

export async function runRootCauseAnalysis(incident: IncidentDocument) {
  const logs = await LogEntryModel.find({ _id: { $in: incident.logIds } })
    .sort({ timestamp: 1 })
    .limit(50);

  const logContext = logs
    .map((log) => `[${log.timestamp.toISOString()}] ${log.level} ${log.service}: ${log.message}`)
    .join("\n");

  const metadataContext = logs.map((log) => metadataSearchText(log.metadata)).filter(Boolean).join("\n");
  const query = `${incident.service} ${incident.fingerprint}\n${logContext}\n${metadataContext}`;
  const embedding = await createEmbedding(query);
  const repoId = await getRepositoryIdForService(incident.service);
  const contextWindowStart = new Date(incident.startedAt.getTime() - 2 * 60 * 60 * 1000);
  const contextWindowEnd = new Date(incident.lastSeenAt.getTime() + 30 * 60 * 1000);
  const [similarIncidents, codeChunks, deployments, metrics] = await Promise.all([
    searchIncidentMemories(embedding, 5),
    searchIncidentCodeChunks(embedding, query, repoId, 8),
    DeploymentModel.find({
      service: incident.service,
      timestamp: { $gte: contextWindowStart, $lte: contextWindowEnd }
    }).sort({ timestamp: -1 }),
    MetricModel.find({
      service: incident.service,
      timestamp: { $gte: contextWindowStart, $lte: contextWindowEnd }
    })
      .sort({ timestamp: 1 })
      .limit(100)
  ]);

  const prompt = `
You are DebugPilot, an AI engineer and SRE assistant. Analyze this production incident.
Only use evidence for service "${incident.service}". Do not suggest files from another service or repository.

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
${similarIncidents.map((memory) => `- ${memory.title}: ${memory.rootCause}. Fixes: ${(memory.suggestedFixes ?? []).join(", ") || "unknown"}. Outcome: ${memory.outcome ?? "unknown"}`).join("\n") || "None"}

Recent deployments for this service:
${deployments.map((deployment) => {
    const minutesBeforeIncident = Math.round((incident.startedAt.getTime() - deployment.timestamp.getTime()) / 60000);
    const timing = minutesBeforeIncident >= 0 ? `${minutesBeforeIncident} minutes before incident started` : "after incident started";
    return `- ${incident.service} deployed commit ${deployment.commit} ${timing}${deployment.author ? ` by ${deployment.author}` : ""}`;
  }).join("\n") || "None"}

Recent metrics for this service:
${metrics.map((metric) => {
    return `- [${metric.timestamp.toISOString()}] cpu=${metric.cpuUsage}% memory=${metric.memoryUsage}MB requests=${metric.requestCount} errorRate=${metric.errorRate}% avgLatency=${metric.avgLatency}ms`;
  }).join("\n") || "None"}

Relevant code chunks:
${codeChunks.map((chunk) => `FILE: ${chunk.filePath}\n${chunk.content}`).join("\n\n---\n\n") || "No indexed code found"}
`.trim();

  const analysisText = await generateText(prompt);
  const analysis = parseAnalysis(analysisText);
  const relatedCodeChunkIds = codeChunks.map((chunk) => chunk._id as mongoose.Types.ObjectId);
  const similarIncidentIds = similarIncidents.map((memory) => memory._id as mongoose.Types.ObjectId);
  const relatedDeploymentIds = deployments.map((deployment) => deployment._id as mongoose.Types.ObjectId);

  await IncidentModel.updateOne(
    { _id: incident._id },
    {
      $set: {
        analysis,
        relatedCodeChunks: relatedCodeChunkIds,
        similarIncidentIds,
        relatedDeploymentIds
      }
    }
  );

  const outcome = incident.status === "resolved" ? "resolved" : "analysis_generated";
  const memoryText = `${incident.title}\n${analysis.whatHappened}\n${analysis.likelyRootCause}\n${analysis.suggestedFixes.join("\n")}\n${outcome}`;
  await IncidentMemoryModel.updateOne(
    { incidentId: incident._id },
    {
      $set: {
        incidentId: incident._id,
        title: incident.title,
        summary: analysis.whatHappened,
        rootCause: analysis.likelyRootCause,
        suggestedFixes: analysis.suggestedFixes,
        outcome,
        embedding: await createEmbedding(memoryText),
        timestamp: new Date()
      }
    },
    { upsert: true }
  );

  return analysis;
}
