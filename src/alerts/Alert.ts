import mongoose, { Schema } from "mongoose";

export type AlertDocument = {
  _id: mongoose.Types.ObjectId;
  incidentId: mongoose.Types.ObjectId;
  service: string;
  message: string;
  channel: "console" | "webhook";
  status: "sent" | "failed";
  createdAt: Date;
};

const alertSchema = new Schema<AlertDocument>(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: "Incident", required: true, index: true },
    service: { type: String, required: true, index: true },
    message: { type: String, required: true },
    channel: { type: String, enum: ["console", "webhook"], required: true },
    status: { type: String, enum: ["sent", "failed"], required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AlertModel = mongoose.model<AlertDocument>("Alert", alertSchema, "alerts");
