import { embeddingBatches } from "../Embeeding/embeeding.service.config.js";
import { upsertChunks, deleteVectors } from "../vector-store/pinecone.service.js";
import { deleteSourceChunks } from "../vector-store/fullTextSearch.service.js";
import { storeChunksForFullTextSearch } from "../vector-store/fullTextSearch.service.js";
import {deduplicateChunks} from '../Embeeding/hashChunk.service.js'
import {logUsage} from '../analytics/usage.service.js'
const BATCH_SIZE = 100;
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

  const {uniqueChunks , duplicateMap} = await deduplicateChunks(chunks,workspaceId)
   console.log(
    `Embedding ${uniqueChunks.length}/${chunks.length} chunks ` +
    `(saved ${duplicateMap.size} redundant embedding calls)`
  )

  let totalProcessed = 0;
  let totalEmbeddingTokensEstimate = 0;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    // Embed only the current batch so each embedding stays aligned with its chunk.
    const texts = batch.map((chunk) => chunk.childText);

    const embeddings = await embeddingBatches(texts);

    // rough token estimate — 1 token ≈ 4 characters
    totalEmbeddingTokensEstimate += texts.reduce(
      (sum, t) => sum + Math.ceil(t.length / 4), 0
    )

    await Promise.all([
      upsertChunks(batch, embeddings, workspaceId),
      storeChunksForFullTextSearch(batch)
    ]);

    totalProcessed += batch.length;

    console.log(`Processed and stored ${totalProcessed}/${chunks.length} chunks`);

    if (onProgress) {
      await onProgress({
        completed: totalProcessed,
        total: chunks.length
      });
    }
  }

  //cost tracking
  await logUsage({
    workspaceId,
    tupe:'INGESTION',
    embeddingTokens: totalEmbeddingTokensEstimate,
    llmInputTokens:0,
    llmOutputTokens:0,
    latencyMs: null,
    metadat:{
      sourceId,
      totalChunks:chunks.length,
      uniqueChunks:uniqueChunks.length,
      duplicateSkipped:duplicateMap.size
    }

  })
  

  console.log(`Embedding complete. All ${chunks.length} chunks stored.`);
  return { chunksCount: chunks.length };
}
