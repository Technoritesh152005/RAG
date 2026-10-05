import redis from '../../lib/redis.js'
import {encodeVector, decodeVector, cosineSimilarity, sha256} from './vector-cache-utils.js'

//cache the embedding->no need to reuse or recalculate the embedding 
const TTL_SECONDS = 60*60*24
export async function lookupEmbeddingCache(question , workspaceId){
    try{
        const textHash = sha256(question.trim().toLowerCase())
        const cached = await redis.get(key(workspaceId,textHash))
        if(!cached)return {
            hit:false
        }
        return decodeVector(cached)
    }catch(error){
        console.error('L2 embedding cache lookup error:', error.message)
    return null   // degrade to a miss, never break the pipeline
    }
}
const key = (workspaceId, textHash) =>
  `embcache:${workspaceId}:${textHash}`;
//we cant store hash values in redis cause u cant convert it back

export async function storeEmbeddingCache(question,workspaceId,embedding){
    try{
        const textHash = sha256(question.trim().toLowerCase())
        await redis.set(key(workspaceId, textHash), encodeVector(embedding), 'EX',TTL_SECONDS)
    }catch(error){
       console.error('L2 embedding cache store error:', error.message)
    }
}