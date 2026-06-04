import mongoose, { Schema } from "mongoose";

export type IncidentMemoryDocument = {
  _id: mongoose.Types.ObjectId;
  incidentId: mongoose.Types.ObjectId;
  title: string;
  summary: string;
  rootCause: string;
  resolution?: string;
  embedding: number[];
  timestamp: Date;
};

const incidentMemorySchema = new Schema<IncidentMemoryDocument>(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: "Incident", required: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    rootCause: { type: String, required: true },
    resolution: String,
    embedding: { type: [Number], required: true },
    timestamp: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

export const IncidentMemoryModel = mongoose.model<IncidentMemoryDocument>(
  "IncidentMemory",
  incidentMemorySchema,
  "incident_memories"
);
