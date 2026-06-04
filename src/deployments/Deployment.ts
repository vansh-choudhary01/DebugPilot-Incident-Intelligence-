import mongoose, { Schema } from "mongoose";

export type DeploymentDocument = {
  _id: mongoose.Types.ObjectId;
  service: string;
  commit: string;
  timestamp: Date;
  author?: string;
  createdAt: Date;
};

const deploymentSchema = new Schema<DeploymentDocument>(
  {
    service: { type: String, required: true, index: true },
    commit: { type: String, required: true },
    timestamp: { type: Date, required: true, index: true },
    author: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

deploymentSchema.index({ service: 1, timestamp: -1 });

export const DeploymentModel = mongoose.model<DeploymentDocument>("Deployment", deploymentSchema, "deployments");
