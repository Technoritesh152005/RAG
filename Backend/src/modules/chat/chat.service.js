import prisma from "../../lib/prisma.js";

const INITIAL_MESSAGE_LOAD = 30;
const OLDER_HISTORY_LIMIT = 50;

export async function saveMessage({
  workspaceId,
  role,
  content,
  sources = null,
}) {
  return prisma.message.create({
    data: {
      workspaceId,
      role,
      content,
      sources, // stored as json in postgres
    },
  });
}

export async function getAllMessages(workspaceId, userId) {
  //const w

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
      userId,
    },
  });
  if (!workspace) throw new Error("Workspace Not Found");

  const messages = await prisma.message.findMany({
    where: {
      workspaceId,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: INITIAL_MESSAGE_LOAD + 1,
  });
  const hasMore = messages.length > INITIAL_MESSAGE_LOAD;

  return {
    hasMore,
    messages: messages.slice(0, INITIAL_MESSAGE_LOAD).reverse(),
  };
}

export async function deleteWorkspaceMessage(workspaceId, userId) {
  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
      userId,
    },
  });
  if (!workspace)
    throw new Error(
      "Workspace Not Found or You are not authorized to delete this BHADWE",
    );
  console.log("Deleting all messages for workspace:", workspaceId);
  return prisma.message.deleteMany({
    where: {
      workspaceId,
    },
  });
}

export async function getMessageCount(workspaceId) {
  return prisma.message.count({
    where: {
      workspaceId,
      role: "USER",
    },
  });
}

//gets latest 50 question
export async function getUserQuestions(workspaceId) {
  const messages = await prisma.message.findMany({
    where: {
      workspaceId,
      role: "USER",
    },
    orderBy: { createdAt: "desc" },
    take: 50, // last 50 questions for FAQ generation
  });
  return messages.map((m) => m.content);
}

export async function getOlderMessage(workspaceId, userId, beforeMessageId) {
  if (!beforeMessageId) {
    throw new Error("Need old / last message id to fetch prev id");
  }
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId, userId },
    select: { id: true },
  });
  if (!workspace)
    throw new Error(
      "Workspace not found or u r not eligible to perform these opn",
    );
  const cursor = await prisma.message.findFirst({
    where: {
      id: beforeMessageId,
      workspaceId,
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  if (!cursor) throw new Error("Message cursor not found");

  const rows = await prisma.message.findMany({
    where: {
      workspaceId,
      OR: [
        {
          createdAt: { lt: cursor.createdAt },
        },
        {
          createdAt: cursor.createdAt,
          id: { lt: cursor.id },
        },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: OLDER_HISTORY_LIMIT + 1,
  });
  const hasMore = rows.length > OLDER_HISTORY_LIMIT;

  return {
    messages: rows.slice(0, OLDER_HISTORY_LIMIT).reverse(),
    hasMore,
  };
}
