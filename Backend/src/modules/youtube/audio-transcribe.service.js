import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import Groq from "groq-sdk";

// @distube/ytdl-core
// Downloads the YouTube video/audio stream.

// fluent-ffmpeg
// Node.js wrapper that lets your code control FFmpeg.

// ffmpeg-static
// Provides the actual FFmpeg executable inside your project.

ffmpeg.setFfmpegPath(ffmpegStatic);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

//eah audio is divided in 10min chunk
const CHUNK_DURATION_SECONDS = 600;
const WHISPER_MODEL = "whisper-large-v3";

export async function transcribeAudioFallback(videoId, onProgress) {
  //creates a temp file
  const workDir = path.join(
    os.tmpdir(),
    `yt-${videoId}-${crypto.randomBytes(4).toString("hex")}`,
  );
  await fsPromises.mkdir(workDir, { recursive: true });

  try {
    if (onProgress) await onProgress({ stage: "audio_download" });
    const audioPath = await downloadAudio(videoId, workDir);

    if (onProgress) await onProgress({ stage: "splitting_audio" });
    const chunkPaths = await splitAudio(audioPath, workDir);

    console.log(
      `Audio split into ${chunkPaths.length} chunk(s) of ~${CHUNK_DURATION_SECONDS}s each`,
    );
    const allSegments = [];
    const concurrency = 3;
    for (let i = 0; i < chunkPaths.length; i += concurrency) {
      //we transcribe each chunk seperately
      //at a time in a batch put 3 chuns+ks
      const batch = chunkPaths.slice(i, i + concurrency);
      const chunkSegments = await Promise.all(
        batch.map((chunk, batchIndex) =>
          transcribeChunks(
            chunk,
            (i + batchIndex) * CHUNK_DURATION_SECONDS,
          ),
        ),
      );

      console.log(
        `Im here at chunkSegments after transcribing and mapping the time, response or answer looks like ${chunkSegments}`,
      );
      allSegments.push(...chunkSegments);

      // respect Groq free-tier rate limits between sequential calls
      if (i < chunkPaths.length - 1) await sleep(500);
    }

    console.log(
      `Whisper fallback transcription complete: ${allSegments.length} segments`,
    );
    return allSegments;
  } catch (error) {
    throw error;
  } finally {
    // always clean up temp audio/chunk files, even if a step above threw —
    // this is a bounded temp dir, never leaves orphaned files on disk
    await fsPromises
      .rm(workDir, { recursive: true, force: true })
      .catch(() => {});
  }
}

function downloadAudio(videoId, workDir) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(workDir, "audio.webm");
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    //it gives a readable stream
    const stream = ytdl(url, {
      quality: "lowestaudio",
      filter: "audioonly",
    });
    //create a filestream to this path
    const fileStream = fs.createWriteStream(outputPath);
    //pipe helps to write stream to this path
    stream.pipe(fileStream);
    stream.on("error", reject);
    fileStream.on("error", reject);
    fileStream.on("finish", () => resolve(outputPath));
  });
}

//god knows how this fxn works
// re-encodes to mono 16kHz mp3 and splits into fixed-length segments.
// re-encoding (rather than stream-copy splitting) guarantees accurate
// segment boundaries — compressed audio can only be cut cleanly at
// keyframes otherwise, which would desync our timestamp offsets
function splitAudio(inputPath, workDir) {
  return new Promise((resolve, reject) => {
    const outputPattern = path.join(workDir, "chunk-%03d.mp3");

    ffmpeg(inputPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec("libmp3lame")
      .audioBitrate("64k")
      .outputOptions([
        "-f segment",
        `-segment_time ${CHUNK_DURATION_SECONDS}`,
        "-reset_timestamps 1",
      ])
      .output(outputPattern)
      .on("end", async () => {
        const files = (await fsPromises.readdir(workDir))
          .filter((f) => f.startsWith("chunk-") && f.endsWith(".mp3"))
          .sort()
          .map((f) => path.join(workDir, f));
        resolve(files);
      })
      .on("error", reject)
      .run();
  });
}
async function transcribeChunks(filePath, offsetSeconds) {
  const response = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: WHISPER_MODEL,
    response_format: "verbose_json",
  });

  console.log(
    "The response from groq after transcription of audio looks like this for " +
      `${offsetSeconds} like ${response}`,
  );
  // shift each segment's time by this chunk's position in the full
  // video — Whisper only sees the isolated chunk, knows nothing about
  // where it sits in the original timeline
  return response.segments.map((seg) => ({
    text: seg.text.trim(),
    start: seg.start + offsetSeconds,
    end: seg.end + offsetSeconds,
  }));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}