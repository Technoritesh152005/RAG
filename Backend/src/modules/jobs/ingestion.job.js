import { embeddingBatches } from "../Embeeding/embeeding.service.config.js";
import { upsertChunks, deleteVectors } from "../vector-store/pinecone.service.js";
import { deleteSourceChunks } from "../vector-store/fullTextSearch.service.js";
import { storeChunksForFullTextSearch } from "../vector-store/fullTextSearch.service.js";
import {deduplicateChunks, persistChunkHashes} from '../Embeeding/hashChunk.service.js'
import {logUsage} from '../analytics/usage.service.js'
const BATCH_SIZE = 200;
export async function embedAndStore(chunks, sourceId, workspaceId, onProgress) {
  if (!chunks || chunks.length === 0) {
    console.log("No chunks found for embedding");
    return { chunksCount: 0 };
  }

  console.log("Embedding and storing chunks for source:", sourceId);

  await Promise.all([
    deleteVectors(sourceId, workspaceId),
    deleteSourceChunks(sourceId)
  ]);

  const {uniqueChunks, duplicateMap, newHashRecords} = await deduplicateChunks(chunks,workspaceId)
   console.log(
    `Embedding ${uniqueChunks.length}/${chunks.length} chunks ` +
    `(saved ${duplicateMap.size} redundant embedding calls)`
  )

  if (uniqueChunks.length === 0) {
    throw new Error('No new chunks were available for embedding')
  }

  let totalProcessed = 0;
  let totalEmbeddingTokensEstimate = 0;
  for (let i = 0; i < uniqueChunks.length; i += BATCH_SIZE) {
    const batch = uniqueChunks.slice(i, i + BATCH_SIZE);

    // Embed only the current batch so each embedding stays aligned with its chunk.
    const texts = batch.map((chunk) => chunk.childText);

    const embeddings = await embeddingBatches(texts);

    // rough token estimate — 1 token ≈ 4 characters
    totalEmbeddingTokensEstimate += texts.reduce(
      (sum, t) => sum + Math.ceil(t.length / 4), 0
    )

    try {
      await upsertChunks(batch, embeddings, workspaceId);
    } catch (error) {
      console.error('Pinecone batch failed:', error.stack || error);
      throw error;
    }

    try {
      await storeChunksForFullTextSearch(batch);
    } catch (error) {
      console.error('FTS batch failed:', error.stack || error);
      throw error;
    }

    try {
      await persistChunkHashes(newHashRecords?.slice(i, i + batch.length) || []);
    } catch (error) {
      console.error('Chunk hash batch failed:', error.stack || error);
      throw error;
    }

    totalProcessed += batch.length;

    console.log(`Processed and stored ${totalProcessed}/${uniqueChunks.length} chunks`);

    if (onProgress) {
      await onProgress({
        completed: totalProcessed,
        total: uniqueChunks.length
      });
    }
  }

  //cost tracking
  await logUsage({
    workspaceId,
    type:'INGESTION',
    embeddingTokens: totalEmbeddingTokensEstimate,
    llmInputTokens:0,
    llmOutputTokens:0,
    latencyMs: null,
    metadata:{
      sourceId,
      totalChunks:chunks.length,
      uniqueChunks:uniqueChunks.length,
      duplicateSkipped:duplicateMap.size
    }

  })
  

  console.log(`Embedding complete. All ${chunks.length} chunks stored.`);
  return { chunksCount: chunks.length };
}
