import crypto from "crypto";
import redis from "../../lib/redis.js";

const CACHE_TTL = 60 * 60 * 24;

const SIMILARITY_THRESHOLD = 0.9;

const MAX_ENTRIES_PER_WORKSPACE = 100;
//only 100 entries can be cached per workspace

//as redis cant store js object of vector in redis so u convert in float32Array -> raw Bytes -> Base64 string means in the form of string. so when u get means afer encoding u need to decode also

function decodeVectors(base64) {
  const buffer = Buffer.from(base64, "base64");
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
}

function encodeVectors(embedding) {
  const float32 = new Float32Array(embedding);
  return Buffer.from(float32.buffer).toString("base64");
}

function cosineSimilarity(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
//every key has a workspaceId which dont caue cross workspace hits
const vecKey = (workspaceId) => `semantic-cache:vec:${workspaceId}`;
const dataKey = (workspaceId) => `semantic-cache:data:${workspaceId}`;
const lruKey = (workspaceId) => `semantic-cache:lru:${workspaceId}`;

export async function lookUpCache(questionEmbedding, workspaceId) {
  try {
    const start = Date.now();

    //get all cache vector f this workspace
    const cacheVectors = await redis.hgetall(vecKey(workspaceId));
    const entryIds = Object.keys(cacheVectors);

    console.log(
      `This is the cacheVectors which i got all from redis: ${entryIds}`,
    );

    if (entryIds.length === 0) {
      return { hit: false };
    }

    //in memory scan
    let bestIds = null;
    let bestScore = 0;
    for (const entry of entryIds) {
      const cachedVector = decodeVectors(entry);
      const similarity = cosineSimilarity(questionEmbedding, cachedVector);

      if (similarity > bestScore) {
        bestScore = similarity;
        bestIds = entry;
      }
    }

    if (bestScore < SIMILARITY_THRESHOLD) {
      console.log(`Cache missed , best similarity${bestScore}`);
      return {
        hit: false,
      };
    }

    //now fetch the actual payload by giving workspace id and also get data for these question response
    // ur getting the answer associated with the vector
    const payload = await redis.hget(dataKey(workspaceId), bestIds);
    if (!payload) {
      //means vector exist but data may be expired so cleanup
      await redis.hdel(vecKey(workspaceId), bestIds);
      return {
        hit: false,
      };
    }

    //now here means u got the answer
    const entry = JSON.parse(payload);

    //when the size of cache per workspace gets full use lru technique which removes least recently used cache entry
    redis.zadd(lruKey(workspaceId), Date.now(), bestIds).catch(() => {});

    const latencyMs = Date.now() - startTime;
    console.log(
      `Cache HIT (similarity: ${bestScore.toFixed(4)}, ` +
        `${entryIds.length} entries scanned, ${latencyMs}ms)`,
    );

    //return ing cache response
    return {
      hit: true,
      similarity: bestScore,
      answer: entry.answer,
      lookupLatencyMs: latencyMs,
      citations: entry.citations,
      contradiction: entry.contradiction,
      originalQuestion: entry.question,
    };
  } catch (Error) {
    console.error("Cache lookup error:", err.message);
    return { hit: false };
    throw Error;
  }
}

//if cache miss occurs store in cache
export async function storeInCache({
  question,
  questionEmbedding,
  answer,
  citations,
  contradictions,
  workspaceId,
}) {
  // in redis pipeline means at once send multiple commands once only means they execute parraalley only and no need to send seperately which cause more network latecny
  try {
    const entryId = crypto.randomBytes(8).toString("hex");
    const now = Date.now();

    // /redis dont store js object so need to convert in String
    const payload = JSON.stringify({
      question,
      answer,
      citations,
      contradictions,
      createdAt: now,
    });

    const pipeline = redis.pipeline();

    pipeline.hset(
      vecKey(workspaceId),
      entryId,
      encodeVectors(questionEmbedding),
    );
    pipeline.hset(dataKey(workspaceId), entryId, payload);
    pipeline.zadd(lruKey(workspaceId), now, entryId);
    pipeline.expire(vecKey(workspaceId), CACHE_TTL_SECONDS);
    pipeline.expire(dataKey(workspaceId), CACHE_TTL_SECONDS);
    pipeline.expire(lruKey(workspaceId), CACHE_TTL_SECONDS);
    await pipeline.exec();

    deleteCacheEntryIfNeeded(workspaceId)
    console.log(`Cached answer for: "${question.slice(0, 50)}..."`)
  } catch (error) {
     console.error('Cache store error:', error.message)
  }
}


async function deleteCacheEntryIfNeeded(workspaceId){
    //u store entry of cache in lru in sorted set cause it keeps entry in sorted ways of creation time
    const count = await redis.zcard(lruKey(workspaceId))
    if(count <= MAX_ENTRIES_PER_WORKSPACE)return 

    const xcessCount = MAX_ENTRIES_PER_WORKSPACE- xcessCount

   const leastUsedEntryIds =  await redis.zrange(lruKey(workspaceId), 0, excess-1)
   if(leastUsedEntryIds.length === 0)return 

   console.log(`The entry which needs to be removed when size exceeds looks like this: ${leastUsedEntryIds}`)
   const pipeline = redis.pipeline()
    pipeline.hdel(vecKey(workspaceId), ...leastUsedEntryIds)
  pipeline.hdel(dataKey(workspaceId), ...leastUsedEntryIds)
  pipeline.zrem(lruKey(workspaceId), ...leastUsedEntryIds)
  await pipeline.exec()

  console.log(`Cache: evicted ${toEvict.length} LRU entries for workspace ${workspaceId}`)
}

//when user does reindexing means docs is changes delete all the cache of that old docs

export async function deleteWorkspaceCache(workspaceId){

 try {
       
       await redis.del(vecKey(workspaceId))
       await redis.del(dataKey(workspaceId))
       await redis.del(lruKey(workspaceId)) 
       console.log(`Cache invalidated for workspace ${workspaceId}`)
 } catch (error) {
      console.error('Cache invalidation error:', error.message)
 }
}