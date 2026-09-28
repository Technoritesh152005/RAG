import { authenticateMiddleware } from "../auth/auth_middleware.js";
import prisma from "../../lib/prisma.js";
import { getCacheStats, getUsageStats } from "./usage.service.js";

export async function registerUsageRoutes(fastify) {
  fastify.addHook("preHandler", authenticateMiddleware);

  fastify.get("/:workspaceId/usage", async (request, reply) => {
    try {
      const { workspaceId } = request.params;

      const workspace = await prisma.workspace.findUnique({
        where: {
          id: workspaceId,
          userId: request.user.id,
        },
      });

      if (!workspace) {
        return reply.status(404).send({ error: "Workspace Not Found" });
      }

      const stats = await getUsageStats(workspaceId);
      return reply.send(stats);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  });

  fastify.get("/:workspaceId/getCacheStats", async (request, reply) => {
    try {
      const { workspaceId } = request.params;

      const workspace = await prisma.workspace.findUnique({
        where: {
          id: workspaceId,
          userId: request.user.id,
        },
      });

      if (!workspace) {
        return reply.status(404).send({ error: "Workspace Not Found" });
      }

      const stats = await getCacheStats(workspaceId);
      return reply.send(stats);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  });
}