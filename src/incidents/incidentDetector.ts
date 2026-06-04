import type { LogEntryDocument } from "../logs/LogEntry.js";
import { LogEntryModel } from "../logs/LogEntry.js";
import { IncidentModel } from "./Incident.js";
import { cosineSimilarity } from "../embeddings/vectorMath.js";
import { enqueueRcaJob } from "../jobs/rcaQueue.js";

const repeatedFailureThreshold = 20;
const repeatedFailureWindowMs = 10 * 60 * 1000;
const spikeThreshold = 30;
const spikeWindowMs = 5 * 60 * 1000;
const semanticSimilarityThreshold = 0.78;

function severityForCount(count: number) {
  if (count >= 50) {
    return "high" as const;
  }

  if (count >= 20) {
    return "medium" as const;
  }

  return "low" as const;
}

export async function detectIncidentForLog(log: LogEntryDocument) {
  const repeatedWindowStart = new Date(log.timestamp.getTime() - repeatedFailureWindowMs);

  const recentErrorLogs = await LogEntryModel.find({
    service: log.service,
    level: { $in: ["error", "fatal"] },
    timestamp: { $gte: repeatedWindowStart, $lte: log.timestamp }
  }).sort({ timestamp: 1 });

  const matchingLogs = recentErrorLogs.filter((entry) => {
    if (entry.fingerprint === log.fingerprint) {
      return true;
    }

    return cosineSimilarity(log.fingerprintEmbedding, entry.fingerprintEmbedding) >= semanticSimilarityThreshold;
  });

  const relatedFingerprints = [...new Set(matchingLogs.map((entry) => entry.fingerprint))];

  const spikeWindowStart = new Date(log.timestamp.getTime() - spikeWindowMs);
  const spikeCount = await LogEntryModel.countDocuments({
    service: log.service,
    level: { $in: ["error", "fatal"] },
    timestamp: { $gte: spikeWindowStart, $lte: log.timestamp }
  });

  if (matchingLogs.length < repeatedFailureThreshold && spikeCount < spikeThreshold) {
    return undefined;
  }

  const existingOpenIncident = await IncidentModel.findOne({
    service: log.service,
    fingerprint: { $in: relatedFingerprints },
    status: "open"
  }).sort({ createdAt: -1 });

  if (existingOpenIncident) {
    existingOpenIncident.occurrenceCount = matchingLogs.length;
    existingOpenIncident.lastSeenAt = log.timestamp;
    existingOpenIncident.logIds = matchingLogs.map((entry) => entry._id);
    existingOpenIncident.severity = severityForCount(Math.max(matchingLogs.length, spikeCount));
    await existingOpenIncident.save();

    if (!existingOpenIncident.analysis) {
      await enqueueRcaJob(existingOpenIncident._id.toString());
    }

    return existingOpenIncident;
  }

  const incident = await IncidentModel.create({
    title: `${log.service} ${log.fingerprint.replaceAll("_", " ")}`,
    service: log.service,
    fingerprint: log.fingerprint,
    severity: severityForCount(Math.max(matchingLogs.length, spikeCount)),
    status: "open",
    occurrenceCount: matchingLogs.length,
    logIds: matchingLogs.map((entry) => entry._id),
    startedAt: matchingLogs[0]?.timestamp ?? log.timestamp,
    lastSeenAt: log.timestamp,
    relatedCodeChunks: [],
    similarIncidentIds: [],
    relatedDeploymentIds: []
  });

  await enqueueRcaJob(incident._id.toString());
  return incident;
}
