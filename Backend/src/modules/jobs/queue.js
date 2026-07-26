import {Queue} from 'bullmq'
import redis from '../../lib/redis.js'

export const ingestionQueue = new Queue(
    'ingestion-queue',
    {connection:redis,
        attempts:3,
        backoff:{
            type: 'exponential',
            delay: 5000  
        },
        removeOnComplete: 100,          // keep last 100 completed jobs
        removeOnFail: 200               // keep last 200 failed jobs
    }

)

export async function addIngestionQueue(data){
    const job = await ingestionQueue.add('ingest-source', data , {
        jobId:`source-${data.sourceId}`
    })
    console.log('Ingestion job added in queue')
}