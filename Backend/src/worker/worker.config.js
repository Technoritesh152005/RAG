import {Worker} from 'bullmq'
import redis from '../lib/redis.js'

const worker = new Worker(
    'ingestion',
    async(job)=>{
        console.log('Processing Job')

        // ingestion logic goes later
    },
    {connection:redis,
        concurrency:3
    }
)

worker.on('completed',(job)=>{
    console.log(`Job ${job.id} completed`)
})
worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message)
  })