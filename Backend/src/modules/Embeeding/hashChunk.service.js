import crypto from "crypto";
import prisma from "../../lib/prisma.js";

// this code embeeds the chunks which r unique only. it dont chunks duplicate chunks
// as we send batch of chunks we see whether the same batch has duplicate chunks which avoids to embedd
export async function deduplicateChunks(chunks, workspaceId) {
  const chunkHashes = chunks.map((chunk) => ({
    chunk,
    hash: generateHash(chunk.childText),
  }));
  const firstSeenInBatch = new Map(); // hash, chunkid
  const batchUniqueHashes = [];
  const duplicateMap = new Map();

  // this checks what all unique chunks we have arrived and what all duplicate chunks it came and we seperate it out
  for (const { chunk, hash } of chunkHashes) {
    if (firstSeenInBatch.has(hash)) {
      duplicateMap.set(chunk.id, firstSeenInBatch.get(hash));
    } else {
      firstSeenInBatch.set(hash, chunk.id);
      batchUniqueHashes.push(hash);
    }
  }
  //fetch all the hashes of this workspace and check which of these unique hashes already exist in this particular workspace hashes
  //it returns what all chunks are aleady exist in our db
  const existingRecords = await prisma.chunkHash.findMany({
    where: {
      workspaceId,
      contentHas: { in: batchUniqueHashes },
    },
    select: {
      contentHash: true,
      chunkId: true,
    },
  });

  const existingChunksHashMap = new Map(
    existingRecords.map((r) => [r.contentHash, r.chunkId]),
  );

  //now u have unique hash in this batch vs the duplicate hash from this batch which u should not keep in db
  const uniqueChunks = [];
  const newHashRecords = [];

  for (const { chunk, hash } of chunkHashes) {
    // already marked duplicate against another chunk in this same batch
    if (duplicateMap.has(chunk.id)) continue;

    const existingChunkId = existingChunksHashMap.get(hash);
    if (existingChunkId) {
      duplicateMap.set(chunk.id, existingChunkId);
    } else {
      // genuinely new content
      uniqueChunks.push(chunk);
      newHashRecords.push({
        contentHash: hash,
        workspaceId,
        chunkId: chunk.id,
      });
    }
  }

  //one buld insert for unique chunks which r not duplicate in batches and also in db
  if (newHashRecords.length > 0) {
    await prisma.chunkHash.createMany({
      data: newHashRecords,
      skipDuplicates: true,
    });
  }
  console.log(
    `Dedup: ${chunks.length} chunks → ${uniqueChunks.length} unique, ` +
      `${duplicateMap.size} duplicates skipped (2 DB queries total)`,
  );

  return { uniqueChunks, duplicateMap };
}

function generateHash(chunk) {
  return crypto
    .createHash("sha256")
    .update(text.trim().toLowerCase())
    .digest("hex");
}

//delete all chunk hash of the particular workspace
export async function deleteWorkspaceHashes(workspaceId) {
  await prisma.chunkHash.deleteMany({ where: { workspaceId } });
}
