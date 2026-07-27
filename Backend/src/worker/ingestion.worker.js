import dotenv from 'dotenv'
import { Worker } from 'bullmq'
import redis from '../lib/redis.js'
import { updateSourceStatus } from '../modules/sources/source.js'
import { crawlSource } from '../modules/crawler/crawler.service.js'

dotenv.config();

console.log('Started Worker Crawling Processing Job')

const worker = new Worker(
    'ingestion',
    async (job) => {
        const { sourceId, workspaceId, url } = job.data
        console.log(`Starting ingestion for source: ${sourceId}, url: ${url}`)

        try {

            // mark as scraping
            await updateSourceStatus(sourceId, 'SCRAPING')
            await emitStatusUpdate(workspaceId, sourceId, 'SCRAPING')
           

            const { allChunks, pageCount, chunkCount } = await crawlSource({
                url,
                sourceId,
                workspaceId,

                // this is a function which is called 
                onProgress: async ({ pageUrl, pageCount }) => {

                    console.log(`Crawled page ${pageCount}: ${pageUrl}`)
                    await prisma.source.update({
                        where: { id: sourceId },
                        data: { pageCount },
                    })
                },

                // called with chunks which gets from each page
                onPageCrawled: async ({ pageUrl, pageTitle, chunks }) => {
                    console.log(`Got ${chunks.length} chunks from ${pageUrl}`)
                }
            })

            // now till here means u have crawled and got the chunks also
            await updateSourceStatus(sourceId, 'CHUNKING')
            await emitStatusUpdate(workspaceId, sourceId, 'CHUNKING')

        } catch (error) {
            console.error(`Ingestion failed for source ${sourceId}:`, err.message)

            // mark as failed with error message
            await updateSourceStatus(sourceId, 'FAILED', {
                error: err.message
            })
        }
    },
    {
        connection:redis,
        concurrency:3
    }
)

// now we use pub sub here cause in our rag we have 2 independent process- worker and server
// pub sub helps to tell frontend with help of socket the status of ingestion

async function emitStatusUpdates(sourceId, workspaceId, status , extra={}){

    await redis.publish('source:status', JSON.stringify({
        workspaceId,
    sourceId,
    status,
    ...extra
    }))
}

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
  })
  
  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed after retries:`, err.message)
  })
  
  worker.on('error', (err) => {
    console.error('Worker error:', err)
  })