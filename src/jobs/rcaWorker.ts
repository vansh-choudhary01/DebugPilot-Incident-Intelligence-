import { Worker } from "bullmq";
import { sendIncidentAlert } from "../alerts/alertService.js";
import { runRootCauseAnalysis } from "../agents/rootCauseAgent.js";
import { redisConnectionOptions } from "../config/redisConnection.js";
import { IncidentModel } from "../incidents/Incident.js";
import { rcaQueueName, type RcaJobData } from "./rcaQueue.js";

export function startRcaWorker() {
  const worker = new Worker<RcaJobData>(
    rcaQueueName,
    async (job) => {
      const incident = await IncidentModel.findById(job.data.incidentId);

      if (!incident) {
        throw new Error(`Incident not found: ${job.data.incidentId}`);
      }

      await runRootCauseAnalysis(incident);

      const analyzedIncident = await IncidentModel.findById(incident._id);
      if (analyzedIncident) {
        await sendIncidentAlert(analyzedIncident);
      }
    },
    {
      connection: redisConnectionOptions(),
      concurrency: 2
    }
  );

  worker.on("completed", (job) => {
    console.log(`[debugpilot worker] RCA complete for ${job.data.incidentId}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[debugpilot worker] RCA failed for ${job?.data.incidentId}`, error);
  });

  return worker;
}
