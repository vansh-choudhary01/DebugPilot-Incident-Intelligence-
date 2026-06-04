import mongoose, { Schema } from "mongoose";

export type RepositoryDocument = {
  _id: mongoose.Types.ObjectId;
  url: string;
  name: string;
  localPath: string;
  status: "pending" | "indexed" | "failed";
  indexedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
};

const repositorySchema = new Schema<RepositoryDocument>(
  {
    url: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    localPath: { type: String, required: true },
    status: { type: String, enum: ["pending", "indexed", "failed"], default: "pending" },
    indexedAt: Date,
    lastError: String
  },
  { timestamps: true }
);

export const RepositoryModel = mongoose.model<RepositoryDocument>("Repository", repositorySchema);
