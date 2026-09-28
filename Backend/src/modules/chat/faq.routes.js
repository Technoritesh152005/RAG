import { authenticateMiddleware } from "../auth/auth_middleware.js";
import { getFAQs, generateFAQ } from "./faq.service.js";
import { getMessageCount } from "./chat.service.js";
import prisma from "../../lib/prisma.js";

export async function faqRoutes(fastify) {
  fastify.addHook("preHandler", authenticateMiddleware);

  fastify.get("/:workspaceId/faqs", async (request, reply) => {
    try {
      const faqs = await getFAQs(
        request.params.workspaceId,
        request.user.id,
      );

      return reply.send({ faqs });
    } catch (error) {
      return reply.status(404).send({ error: error.message });
    }
  });

  //ypur faq works only when u have atleast 5 msg and automatically geenrates faqs when the count of question gets 10
  fastify.post("/:workspaceId/faqs/generate", async (request, reply) => {
    const { workspaceId } = request.params;

    try {
      const workspace = await prisma.workspace.findUnique({
        where: {
          id: workspaceId,
          userId: request.user.id,
        },
      });

      if (!workspace) {
        return reply.status(404).send({ error: "Workspace Not Found" });
      }

      const questionCount = await getMessageCount(workspaceId);

      if (questionCount < 5) {
        return reply.status(400).send({
          error: "Ask at least 5 questions before generating FAQs.",
        });
      }

      generateFAQ(workspaceId).catch((error) => {
        request.log.error(error, "FAQ generation failed");
      });

      return reply.code(202).send({
        message: "FAQ generation started in the background",
      });
    } catch (error) {
      request.log.error(error, "Unable to start FAQ generation");
      return reply.status(500).send({
        error: "Unable to start FAQ generation",
      });
    }
  });
}