import redis from '../../lib/redis.js'
import crypto from 'crypto'

//if we get same set of chunks then instead of recalculating the contradiction just return the response from here

const TTL_SECONDS = 60*60*24

function chunkSetHash(result){
    const sortedIds = result.map((r)=>r.id).sort().join(',')
    return crypto.createHash('sha256').update(sortedIds).digest('hex')
}
const key = (workspaceId, hash) =>
  `contrcache:${workspaceId}:${hash}`;

export async function lookupContradictionCache(results,workspaceId){

    try{
        const hash = chunkSetHash(results)
        const cached = await redis.get(key(workspaceId,hash))
        if(!cached)return {hit:false}
        console.log(`L4 contradiction cache HIT (chunk set: ${results.length} chunks)`)
        return { hit: true, contradiction: JSON.parse(cached) }
    }catch(error){
        console.error('L4 contradiction cache lookup error:', error.message)
    return { hit: false }
    }
}
export async function storeContradictionCache(results, workspaceId, contradiction) {
  try {
    const hash = chunkSetHash(results)
    // storing `null` is valid and meaningful here — "these chunks
    // were checked and found to NOT contradict" is itself worth caching
    await redis.set(key(workspaceId, hash), JSON.stringify(contradiction), 'EX', TTL_SECONDS)
  } catch (err) {
    console.error('L4 contradiction cache store error:', err.message)
  }
}