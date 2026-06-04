import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redisConnection.js";

export const rcaQueueName = "root-cause-analysis";

export type RcaJobData = {
  incidentId: string;
};

export const rcaQueue = new Queue<RcaJobData>(rcaQueueName, {
  connection: redisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 100
  }
});

export async function enqueueRcaJob(incidentId: string) {
  await rcaQueue.add(
    "analyze-incident",
    { incidentId },
    {
      jobId: `incident-${incidentId}`
    }
  );
}
