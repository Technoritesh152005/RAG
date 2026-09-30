import "dotenv/config";
import { Worker } from "bullmq";
import redis from "../lib/redis.js";
import { embedAndStore } from "../modules/jobs/ingestion.job.js";
import { updateSourceStatus } from "../modules/sources/source.service.js";
import { crawlSource } from "../modules/crawler/crawler.service.js";
import { ingestYouTubeSource } from "../modules/youtube/youtube.service.js";
import prisma from "../lib/prisma.js";
import { deleteWorkspaceCache } from "../modules/cache/semantic-cache.service.js";
import "./source-cleanup.worker.js";

const worker = new Worker(
  "ingestion-queue",
  async (job) => {
    const { sourceId, workspaceId, url, sourceType } = job.data;
    console.log(
      `Starting job for source ${sourceId} (type: ${sourceType ?? "WEB"}): ${url}`,
    );

    try {
      await updateSourceStatus(sourceId, "SCRAPING", {
        pageCount: 0,
        chunkCount: 0,
        error: null,
      });
      await emitStatusUpdates(workspaceId, sourceId, "SCRAPING", {
        pageCount: 0,
        chunkCount: 0,
      });

      let pageCount = 0;
      let chunkedCount = 0;
      let allChunks = [];
      let chunkCount = 0;

      if (sourceType === "YOUTUBE") {
        const result = await ingestYouTubeSource({
          url,
          sourceId,
          workspaceId,
          onProgress: async (progress) => {
            console.log(`YouTube ingestion progress for ${sourceId}:`, progress);
            await emitStatusUpdates(workspaceId, sourceId, "SCRAPING", {
              pageCount: 0,
              chunkCount: chunkedCount,
              ...progress,
            });
          },
        });

        allChunks = result.allChunks ?? [];
        pageCount = 1;
        chunkCount = result.chunkCount ?? allChunks.length;
      } else {
        const result = await crawlSource({
          url,
          sourceId,
          workspaceId,
          onProgress: async ({ pageUrl, pageCount: crawledPages }) => {
            pageCount = crawledPages;
            console.log(`Crawled page ${crawledPages}: ${pageUrl}`);
            await prisma.source.update({
              where: { id: sourceId },
              data: { pageCount: crawledPages },
            });
            await emitStatusUpdates(workspaceId, sourceId, "SCRAPING", {
              pageCount: crawledPages,
              chunkCount: chunkedCount,
            });
          },
          onPageCrawled: async ({ pageUrl, chunks }) => {
            chunkedCount += chunks.length;
            console.log(`Chunked ${chunks.length} pieces from ${pageUrl}`);
            await emitStatusUpdates(workspaceId, sourceId, "SCRAPING", {
              pageCount,
              chunkCount: chunkedCount,
            });
          },
        });

        allChunks = result.allChunks ?? [];
        pageCount = result.pageCount ?? pageCount;
        chunkCount = result.chunkCount ?? allChunks.length;
      }

      console.log(
        `Ingestion source done for ${sourceId}: ${pageCount} pages/units, ${chunkCount} chunks`,
      );

      await updateSourceStatus(sourceId, "CHUNKING", {
        pageCount,
        chunkCount,
      });
      await emitStatusUpdates(workspaceId, sourceId, "CHUNKING", {
        pageCount,
        chunkCount,
      });

      if (allChunks.length === 0) {
        throw new Error("No readable chunks were produced from this source.");
      }

      await updateSourceStatus(sourceId, "EMBEDDING");
      await emitStatusUpdates(workspaceId, sourceId, "EMBEDDING", {
        pageCount,
        chunkCount,
        embeddingCompleted: 0,
        embeddingTotal: chunkCount,
      });

      await embedAndStore(allChunks, sourceId, workspaceId, async ({ completed, total }) => {
        console.log(`Embedding progress for ${sourceId}: ${completed}/${total}`);
        await emitStatusUpdates(workspaceId, sourceId, "EMBEDDING", {
          pageCount,
          chunkCount,
          embeddingCompleted: completed,
          embeddingTotal: total,
        });
      });

      await deleteWorkspaceCache(workspaceId);
      await updateSourceStatus(sourceId, "DONE", {
        pageCount,
        chunkCount,
        error: null,
      });
      await emitStatusUpdates(workspaceId, sourceId, "DONE", {
        pageCount,
        chunkCount,
        embeddingCompleted: chunkCount,
        embeddingTotal: chunkCount,
      });

      console.log(`Job complete for source ${sourceId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Ingestion failed for source ${sourceId}:`, error);

      await updateSourceStatus(sourceId, "FAILED", { error: message }).catch(
        (statusError) => {
          console.error(`Could not save failed status for ${sourceId}:`, statusError);
        },
      );
      await emitStatusUpdates(workspaceId, sourceId, "FAILED", { error: message });
      throw error;
    }
  },
  { connection: redis, concurrency: 3 },
);

//we use redis pub/sub to notify the frontend of status updates for a source
// we cant use socket directly from the worker because the worker is a separate process from the server
// further in server it listens to redis pub/sub and emits socket events to the frontend
async function emitStatusUpdates(workspaceId, sourceId, status, extra = {}) {
  await redis.publish(
    "source:status",
    JSON.stringify({ workspaceId, sourceId, status, ...extra }),
  );
}

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

worker.on("error", (error) => {
  console.error("Ingestion worker error:", error);
});