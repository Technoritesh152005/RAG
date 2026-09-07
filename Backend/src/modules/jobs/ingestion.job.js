import { embeddingBatches } from "../Embeeding/embeeding.service.config.js";
import { upsertChunks, deleteVectors } from "../vector-store/pinecone.service.js";
import { deleteSourceChunks } from "../vector-store/fullTextSearch.service.js";
import { storeChunksForFullTextSearch } from "../vector-store/fullTextSearch.service.js";

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

  let totalProcessed = 0;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    // Embed only the current batch so each embedding stays aligned with its chunk.
    const texts = batch.map((chunk) => chunk.childText);

    const embeddings = await embeddingBatches(texts);

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

  console.log(`Embedding complete. All ${chunks.length} chunks stored.`);
  return { chunksCount: chunks.length };
}
