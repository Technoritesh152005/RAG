import { Worker } from "bullmq";
import redis from "../lib/redis.js";
import { cleanupSource } from "../modules/workspace/cleanup.service.js";

const worker = new Worker(
  "source-cleanup-queue",
  async (job) => {
    const { sourceId, workspaceId } = job.data;
    console.log(`Starting background cleanup for source ${sourceId}`);
    await cleanupSource(sourceId, workspaceId);
  },
  { connection: redis, concurrency: 2 },
);

worker.on("completed", (job) => {
  console.log(`Source cleanup job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Source cleanup job ${job?.id} failed:`, error.message);
});

worker.on("error", (error) => {
  console.error("Source cleanup worker error:", error);
});