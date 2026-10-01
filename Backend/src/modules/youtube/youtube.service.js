import { extractYoutubeVideoId } from "../sources/url-detector.service";
import { fetchTranscript, fetchVideoMetadata } from "./transcript.service";
import { chunkTranscript } from "./youtube.chunker";
import { transcribeAudioFallback } from "./audio-transcribe.service";
import { logUsage } from "../../usage/usage.service";
export async function startIngestionForYoutube({
  url,
  sourceId,
  workspaceId,
  onProgress,
}) {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId)
    throw new Error(
      "Could not extract the id from the url. Please try with diffrent Url",
    );

  if (onProgress) await onProgress({ stage: "fetching_metadata" });
  const { title } = await fetchVideoMetadata(videoId);

  if (onProgress) await onProgress({ stage: "fetching_transcript" });
  const segments = await fetchTranscript(videoId);
  let transcriptionMethod = segments ? "captions" : "whisper";

  if (!segments) {
    //taking a backup approach to transcribe the audio if no captions exist
    //ask user do u need to transcribe the audio using whisper fallback
    const confirm = request.body;
    if (!confirm) return;
    segments = await transcribeAudioFallback(videoId, onProgress);
  }

  if (!segments || segments.length === 0) {
    throw new Error(
      "No captions or audio transcription available for this video. Please try with a different video.",
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

  const audioSeconds = segments[segments.length - 1]?.end || 0;
  await logUsage({
    workspaceId,
    type: "INGESTION",
    embeddingTokens: 0,
    llmInputTokens: 0,
    llmOutputTokens: 0,
    latencyMs: null,
    metadata: { sourceId, transcriptionMethod, audioSeconds, videoId },
  });

  return {
    allChunks,
    videoId,
    title,
    segmentCount: segments.length,
    transcriptionMethod,
  };
}
