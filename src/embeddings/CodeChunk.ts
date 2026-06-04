import mongoose, { Schema } from "mongoose";

export type CodeChunkDocument = {
  _id: mongoose.Types.ObjectId;
  repoId: mongoose.Types.ObjectId;
  filePath: string;
  content: string;
  chunkIndex: number;
  embedding: number[];
};

const codeChunkSchema = new Schema<CodeChunkDocument>(
  {
    repoId: { type: Schema.Types.ObjectId, ref: "Repository", index: true, required: true },
    filePath: { type: String, required: true },
    content: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    embedding: { type: [Number], required: true }
  },
  { timestamps: true }
);

codeChunkSchema.index({ repoId: 1, filePath: 1, chunkIndex: 1 }, { unique: true });

export const CodeChunkModel = mongoose.model<CodeChunkDocument>("CodeChunk", codeChunkSchema, "code_chunks");
