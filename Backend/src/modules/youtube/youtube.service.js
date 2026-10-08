import { extractVideoUrl } from "../sources/url-detector.service.js";
import { fetchTranscript, fetchVideoMetadata } from "./transcript.service.js";
import { chunkTranscript } from "./youtube.chunker.js";
import { logUsage } from "../analytics/usage.service.js";
import { UnrecoverableError } from "bullmq";
export async function startIngestionForYoutube({
  url,
  sourceId,
  workspaceId,
  onProgress,
}) {
  const videoId = extractVideoUrl(url);
  if (!videoId)
    throw new Error(
      "Could not extract the id from the url. Please try with diffrent Url",
    );

  if (onProgress) await onProgress({ stage: "fetching_metadata" });
  const { title } = await fetchVideoMetadata(videoId);

  if (onProgress) await onProgress({ stage: "fetching_transcript" });
  const segments = await fetchTranscript(videoId);

  if (!segments || segments.length === 0) {
    throw new UnrecoverableError(
      "No captions or transcript were found for this YouTube video. Please try a video with captions enabled.",
    );
  }

  if (onProgress)
    await onProgress({ stage: "chunking", segmentCount: segments.length });
  const allChunks = chunkTranscript({
    segments,
    videoId,
    sourceId,
    videoTitle: title,
    workspaceId,
  });
  console.log(
    `YouTube ingestion: ${segments.length} caption segments → ${allChunks.length} chunks`,
  );

  await logUsage({
    workspaceId,
    type: "INGESTION",
    embeddingTokens: 0,
    llmInputTokens: 0,
    llmOutputTokens: 0,
    latencyMs: null,
    metadata: { sourceId, videoId },
  });

  return {
    allChunks,
    videoId,
    title,
    segmentCount: segments.length,
  };
}
