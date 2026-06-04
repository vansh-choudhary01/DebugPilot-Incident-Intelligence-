import mongoose, { Schema } from "mongoose";

export type LogEntryDocument = {
  _id: mongoose.Types.ObjectId;
  service: string;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  fingerprint: string;
  fingerprintEmbedding: number[];
  createdAt: Date;
};

const logEntrySchema = new Schema<LogEntryDocument>(
  {
    service: { type: String, required: true, index: true },
    level: { type: String, enum: ["debug", "info", "warn", "error", "fatal"], required: true, index: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, required: true, index: true },
    fingerprint: { type: String, required: true, index: true },
    fingerprintEmbedding: { type: [Number], required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LogEntryModel = mongoose.model<LogEntryDocument>("LogEntry", logEntrySchema, "logs");
