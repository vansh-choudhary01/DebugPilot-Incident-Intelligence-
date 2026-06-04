import { z } from "zod";
import { LogEntryModel } from "./LogEntry.js";
import { generateFingerprint } from "./fingerprint.js";
import { detectIncidentForLog } from "../incidents/incidentDetector.js";

export const logPayloadSchema = z.object({
  service: z.string().min(1),
  level: z.enum(["debug", "info", "warn", "error", "fatal"]),
  message: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.coerce.date().optional()
});

export async function ingestLog(payload: unknown) {
  const parsed = logPayloadSchema.parse(payload);
  const log = await LogEntryModel.create({
    ...parsed,
    timestamp: parsed.timestamp ?? new Date(),
    fingerprint: generateFingerprint(parsed.message)
  });

  if (log.level === "error" || log.level === "fatal") {
    await detectIncidentForLog(log);
  }

  return log;
}
