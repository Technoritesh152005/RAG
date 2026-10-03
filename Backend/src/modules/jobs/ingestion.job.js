import { performance } from 'node:perf_hooks'
import prisma from '../../lib/prisma.js'
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
    const result = {
      status: "already_up_to_date",
      chunksCount: chunks.length,
      newChunks: 0,
      duplicates: duplicateMap.size,
    };
    console.log(
      `No new chunks found for source ${sourceId}. ` +
        `This content is already available in workspace ${workspaceId}.`,
    );
    return result;
  }

  let totalProcessed = 0;
  let totalEmbeddingTokensEstimate = 0;
  const totalBatches = Math.ceil(uniqueChunks.length / BATCH_SIZE);
  for (let i = 0; i < uniqueChunks.length; i += BATCH_SIZE) {
    const batch = uniqueChunks.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    // Embed only the current batch so each embedding stays aligned with its chunk.
    const texts = batch.map((chunk) => chunk.childText);

    const embeddingStartedAt = performance.now();
    const embeddings = await embeddingBatches(texts);
    const embeddingMs = performance.now() - embeddingStartedAt;

    // rough token estimate — 1 token ≈ 4 characters
    totalEmbeddingTokensEstimate += texts.reduce(
      (sum, t) => sum + Math.ceil(t.length / 4), 0
    )

    const hashBatch = newHashRecords?.slice(i, i + batch.length) || [];
    const storageStartedAt = performance.now();
    const [pineconeResult, postgresResult] = await Promise.allSettled([
      (async () => {
        const startedAt = performance.now();
        await upsertChunks(batch, embeddings, workspaceId);
        return performance.now() - startedAt;
      })(),
      (async () => {
        const startedAt = performance.now();
        await prisma.$transaction(async (tx) => {
          await storeChunksForFullTextSearch(batch, tx);
          await persistChunkHashes(hashBatch, tx);
        });
        return performance.now() - startedAt;
      })(),
    ]);
    const storageMs = performance.now() - storageStartedAt;

    if (pineconeResult.status === 'rejected') {
      console.error('Pinecone batch failed:', pineconeResult.reason.stack || pineconeResult.reason);
      throw pineconeResult.reason;
    }
    if (postgresResult.status === 'rejected') {
      console.error('Postgres batch failed:', postgresResult.reason.stack || postgresResult.reason);
      throw postgresResult.reason;
    }

    totalProcessed += batch.length;

    console.log(
      `[Ingestion] Source ${sourceId}: batch ${batchNumber}/${totalBatches} ` +
      `embedded and stored ${batch.length} chunks ` +
      `(${totalProcessed}/${uniqueChunks.length} total); ` +
      `embedding=${embeddingMs.toFixed(0)}ms, ` +
      `Pinecone=${pineconeResult.value.toFixed(0)}ms, ` +
      `Postgres=${postgresResult.value.toFixed(0)}ms, ` +
      `parallel storage=${storageMs.toFixed(0)}ms`
    );

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
