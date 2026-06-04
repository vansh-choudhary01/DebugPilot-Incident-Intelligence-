import mongoose, { Schema } from "mongoose";
import type { RootCauseAnalysis } from "../types/analysis.js";

export type IncidentDocument = {
  _id: mongoose.Types.ObjectId;
  title: string;
  service: string;
  fingerprint: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved";
  occurrenceCount: number;
  logIds: mongoose.Types.ObjectId[];
  startedAt: Date;
  lastSeenAt: Date;
  analysis?: RootCauseAnalysis;
  relatedCodeChunks: mongoose.Types.ObjectId[];
  similarIncidentIds: mongoose.Types.ObjectId[];
  relatedDeploymentIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

const rootCauseSchema = new Schema<RootCauseAnalysis>(
  {
    whatHappened: String,
    likelyRootCause: String,
    filesToInspect: [String],
    suggestedFixes: [String],
    confidenceScore: Number
  },
  { _id: false }
);

const incidentSchema = new Schema<IncidentDocument>(
  {
    title: { type: String, required: true },
    service: { type: String, required: true, index: true },
    fingerprint: { type: String, required: true, index: true },
    severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["open", "resolved"], default: "open", index: true },
    occurrenceCount: { type: Number, default: 0 },
    logIds: [{ type: Schema.Types.ObjectId, ref: "LogEntry" }],
    startedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    analysis: rootCauseSchema,
    relatedCodeChunks: { type: [{ type: Schema.Types.ObjectId, ref: "CodeChunk" }], default: [] },
    similarIncidentIds: { type: [{ type: Schema.Types.ObjectId, ref: "IncidentMemory" }], default: [] },
    relatedDeploymentIds: { type: [{ type: Schema.Types.ObjectId, ref: "Deployment" }], default: [] }
  },
  { timestamps: true }
);

export const IncidentModel = mongoose.model<IncidentDocument>("Incident", incidentSchema, "incidents");
