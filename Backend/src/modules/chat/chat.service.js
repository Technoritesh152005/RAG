import prisma from "../../lib/prisma.js";

export async function saveMessage({
  workspaceId,
  role,
  content,
  sources = null,
}) {
  return prisma.message.create({
    workspaceId,
    role,
    content,
    sources, // stored as json in postgres
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

  return prisma.message.findMany({
    where: {
      workspaceId,
    },
    order: {
      createdAt: "asc", //take oldest 100 msg first
    },
    take: 100, //
  });
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
