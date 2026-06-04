import mongoose, { Schema } from "mongoose";

export type FingerprintMemoryDocument = {
  _id: mongoose.Types.ObjectId;
  fingerprint: string;
  service: string;
  sampleMessage: string;
  embedding: number[];
  lastSeenAt: Date;
};

const fingerprintMemorySchema = new Schema<FingerprintMemoryDocument>(
  {
    fingerprint: { type: String, required: true, index: true },
    service: { type: String, required: true, index: true },
    sampleMessage: { type: String, required: true },
    embedding: { type: [Number], required: true },
    lastSeenAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

fingerprintMemorySchema.index({ service: 1, fingerprint: 1 }, { unique: true });

export const FingerprintMemoryModel = mongoose.model<FingerprintMemoryDocument>(
  "FingerprintMemory",
  fingerprintMemorySchema,
  "log_fingerprints"
);
