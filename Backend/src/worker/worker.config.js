import { Worker } from "bullmq";
import dotenv from "dotenv";
import redis from "../lib/redis.js";
import { embedAndStore } from "../modules/jobs/ingestion.job.js";
import { updateSourceStatus } from "../modules/sources/source.js";
import { emitStatusUpdates } from "../worker/ingestion.worker.js";

//loads env var in nodejs process
dotenv.config();
const worker = new Worker(
  "ingestion-queue",
  async (job) => {

    const { sourceId, workspaceId, url } = job.data;
    console.log(`Starting job for source: ${sourceId} == ${url}`);
    /* Step 1: Ingestion */

    try {
        await updateSourceStatus(sourceId, "SCRAPING");
        await emitStatusUpdates(workspaceId, sourceId, "SCRAPING");
    
        const { allChunks, pageCount, chunkCount } = await crawlSource({
          url,
          sourceId,
          workspaceId,
    
          onProgress: async ({ pageUrl, pageTitle }) => {
            console.log(`Scraped page ${pageCount}: ${pageUrl}`);
            // update live page count in DB as crawling progresses
            //verytime a page is crawled it is updated in db
            await prisma.source.update({
              where: {
                id: sourceId,
              },
              data: {
                pageCount,
              },
            });
          },
          onPageCrawled: async ({ pageUrl, pageTitle, chunks }) => {
            console.log(
              `The page with title ${pageTitle} has been crawled of url : ${pageUrl} of ${chunks.length}`,
            );
          },
        });
    
    
        console.log(`\nCrawl done — Pages: ${pageCount}, Chunks: ${chunkCount}`)
    
        /* Step 2: Already we have crawled now the next part is EMbedding */
        await updateSourceStatus(sourceId, "EMBEDDING");
        await emitStatusUpdates(workspaceId, sourceId, "EMBEDDING");
    
        await embedAndStore(
          allChunks,
          sourceId,
          workspaceId,
            async({completed,total})=>{
             console.log(`Embedding progress: ${processed}/${total}`)
          }
        );
    
        /* Phase 3: Update source status and DONE */
        await updateSourceStatus(sourceId,"DONE", {
            pageCount,
            chunkCount ,
        })
    
        await emitStatusUpdates(workspaceId, sourceId, 'DONE', {
            pageCount,
            chunkCount
        })
    } catch (error) {
        console.error(error.message)

        await updateSourceStatus(sourceId, 'FAILED', {
            error:error.message
        })
        await emitStatusUpdates(workspaceId, sourceId, 'FAILED', {
            error:error.message
        })

        throw error
    }

    console.log(`\n=== Job complete: ${sourceId} ===\n`)

  },
  { connection: redis, concurrency: 3 },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});
worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

worker.on("error", (err)=>{
    console.error(err + 'Worker Error')
})