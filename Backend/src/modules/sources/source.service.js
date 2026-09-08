//
// here after creating workspace u trgger the job in queue
import prisma from "../../lib/prisma.js";
import { addIngestionQueue, ingestionQueue } from "../jobs/queue.js";
import { cleanupSource } from "../workspaces/cleanup.service.js";

export function validateSourceUrl(sourceUrl) {
  let parsed;
  try {
    //it creates url object from url string
    //u can access diff parts like protocol,hostname,pathname,search
    parsed = new URL(sourceUrl);
  } catch (error) {
    throw new Error("Failed to parse Url");
  }

  if (parsed.pathname === "/" || parsed.pathname === "") {
    throw new Error(
      `Please paste a specific section URL, not the homepage.\n` +
        `Example: https://react.dev/learn instead of https://react.dev`,
    );
  }

  // reject non-http protocols
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }

  // reject localhost — no crawling local servers
  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    throw new Error("Localhost URLs are not supported");
  }

  //if everything clear return true
  return true;
}
export async function addSource({ url, workspaceId, userId }) {

    validateSourceUrl(url)
  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
      userId,
    },
  });
  if (!workspace) throw new Error("Workspace Not Found");

  const source = await prisma.source.create({
    data: {
      url: url,
      workspaceId,
      status: "PENDING",
    },
  });

  // once u saved the job in db push the job in queue so that worker starts the process of executing it
  await addIngestionQueue({
    sourceId: source.id,
    workspaceId,
    url,
  });
  return source;
}

export async function getSource(workspaceId, userId) {
  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
      userId,
    },
  });
  if (!workspace) throw new Error("Workspace not found");

  // find the source all
  return prisma.source.findMany({
    where: {
      workspaceId,
    },
    // returns the latest source
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteSource(sourceId, userId) {
  const source = await prisma.source.findFirst({
    where: {
      id: sourceId,
      workspace: { userId },
    },
    include: { workspace: true },
  });
  if (!source) throw new Error("Source not found");

  // cleanup vectors and chunks first
  await cleanupSource(sourceId, source.workspaceId);

  // then delete from DB
  return prisma.source.delete({ where: { id: sourceId } });
}

// reindex means once again start the ingestion process
export async function reIndexSource(sourceId, userId) {
  const source = await prisma.source.findFirst({
    where: {
      id: sourceId,
      workspaceId: { userId },
    },
  });
  if (!source) throw new Error("No Source found for re-indexing");
  const updatedSource = await prisma.source.updateMany({
    where: { id: sourceId },
    data: {
      status: "PENDING",
      pageCount: null,
      chunkCount: null,
      error: null,
    },
  });

  await ingestionQueue({
    sourceId: source.id,
    workspaceId: source.workspaceId,
    url: source.url,
  });
}

export async function updateSourceStatus(sourceId, status, extraFields = {}) {
  return prisma.source.update({
    where: { id: sourceId },
    data: { status, ...extraFields },
  });
}
