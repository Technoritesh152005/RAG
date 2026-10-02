import crypto from "crypto";

const PARENT_WINDOW_SECONDS = 120;
const PARENT_OVERLAP_SECONDS = 20;

const CHILD_WINDOW_SECONDS = 30;
const CHILD_OVERLAP_SECONDS = 5;

export function chunkTranscript({
  segments,
  videoId,
  sourceId,
  videoTitle,
  workspaceId,
}) {
  if (!segments || segments.length === 0) return [];

  const parentWindows = groupByTimeWindow(
    segments,
    PARENT_WINDOW_SECONDS,
    PARENT_OVERLAP_SECONDS,
  );
  const allChunks = [];

  parentWindows.forEach((parentWindow, parentIndex) => {
    const parentText = parentWindow.segments.map((text) => text.text).join(" ");
    const parentId = generateId(`${sourceId}-${videoId}-parent-${parentIndex}`);

    const childWindows = groupByTimeWindow(
      parentWindow.segments,
      CHILD_WINDOW_SECONDS,
      CHILD_OVERLAP_SECONDS,
    );

    childWindows.forEach((childWindow, childIndex) => {
      const childText = childWindow.segments.map((text) => text.text).join(" ");
      if (!childText.trim()) return;

      const chunkId = generateId(
        `${sourceId}-${videoId}-${parentIndex}-${childIndex}-${childText}`,
      );
      allChunks.push({
        id: chunkId,
        childText,
        parentText,
        metadata: {
          sourceId,
          workspaceId,
          // reuses EXACT field names the doc pipeline expects —
          // this is what makes downstream code source-agnostic
          pageUrl: buildTimestampedUrl(videoId, childWindow.startTime),
          pageTitle: videoTitle,
          sectionHeading: formatTimeRange(
            childWindow.startTime,
            childWindow.endTime,
          ),
          parentId,
          parentIndex,
          chunkIndex: childIndex,

          startTime: childWindow.startTime,
          endTime: childWindow.endTime,
        },
      });
    });
  });

  return allChunks;
  //   allChunks looks like this [
  //     {id,childText,parentText,{metadata}}
  //   ]
}

function groupByTimeWindow(segments, windowSeconds, overlapSeconds) {
  if (segments.length === 0) return [];

  const window = [];

  let i = 0;
  while (i < segments.length) {
    const windowStart = segments[i].start;
    const particularWindowSegments = [];
    let j = i;

    while (
      j < segments.length &&
      segments[j].start - windowStart <= windowSeconds
    ) {
      particularWindowSegments.push(segments[j]);
      j++;
    }

    //agar ek bhi parent xontext nhi hai toh break
    if (particularWindowSegments.length === 0) break;

    const windowEnd =
      particularWindowSegments[particularWindowSegments.length - 1].end;

    window.push({
      startTime: windowStart,
      endTime: windowEnd,
      segments: particularWindowSegments,
    });

    //setting the overlap boundary cause for next window u need some details of prev window
    const overlapBoundary = windowEnd - overlapSeconds;
    let nextIndex = j;

    while (nextIndex > i && segments[nextIndex - 1].start >= overlapBoundary) {
      nextIndex--;
    }

    i = Math.max(nextIndex, i + 1);
  }
  return window;
  //windows here means
  // [
  //     {
  //     startTime: 0,
  //     endTime: 120,
  //     segments: [...]
  // },{start : 110 , end:200},{start: 190, end: 300}]
  // ]
  //
}
function generateId(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

function buildTimestampedUrl(videoId, startSeconds) {
  return `https://youtube.com/watch?v=${videoId}&t=${Math.floor(startSeconds)}s`;
}
function formatTimeRange(startSeconds, endSeconds) {
  return `${formatTimestamp(startSeconds)} - ${formatTimestamp(endSeconds)}`;
}
function formatTimestamp(seconds) {
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
