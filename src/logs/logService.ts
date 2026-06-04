import { z } from "zod";
import { LogEntryModel } from "./LogEntry.js";
import { generateFingerprint } from "./fingerprint.js";
import { detectIncidentForLog } from "../incidents/incidentDetector.js";
import { createEmbedding } from "../embeddings/embeddingService.js";
import { FingerprintMemoryModel } from "./FingerprintMemory.js";

export const logPayloadSchema = z.object({
  service: z.string().min(1),
  level: z.enum(["debug", "info", "warn", "error", "fatal"]),
  message: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.coerce.date().optional()
});

export async function ingestLog(payload: unknown) {
  const parsed = logPayloadSchema.parse(payload);
  const timestamp = parsed.timestamp ?? new Date();
  const fingerprint = generateFingerprint(parsed.message);
  const fingerprintEmbedding = await createEmbedding(`${parsed.service} ${fingerprint} ${parsed.message}`);

  const log = await LogEntryModel.create({
    ...parsed,
    timestamp,
    fingerprint,
    fingerprintEmbedding
  });

  await FingerprintMemoryModel.updateOne(
    { service: parsed.service, fingerprint },
    {
      $set: {
        service: parsed.service,
        fingerprint,
        sampleMessage: parsed.message,
        embedding: fingerprintEmbedding,
        lastSeenAt: timestamp
      }
    },
    { upsert: true }
  );

  if (log.level === "error" || log.level === "fatal") {
    await detectIncidentForLog(log);
  }

  return log;
}
