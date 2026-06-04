import mongoose, { Schema } from "mongoose";

export type MetricDocument = {
  _id: mongoose.Types.ObjectId;
  service: string;
  cpuUsage: number;
  memoryUsage: number;
  requestCount: number;
  errorRate: number;
  avgLatency: number;
  timestamp: Date;
  createdAt: Date;
};

const metricSchema = new Schema<MetricDocument>(
  {
    service: { type: String, required: true, index: true },
    cpuUsage: { type: Number, required: true },
    memoryUsage: { type: Number, required: true },
    requestCount: { type: Number, required: true },
    errorRate: { type: Number, required: true },
    avgLatency: { type: Number, required: true },
    timestamp: { type: Date, required: true, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

metricSchema.index({ service: 1, timestamp: -1 });

export const MetricModel = mongoose.model<MetricDocument>("Metric", metricSchema, "metrics");
