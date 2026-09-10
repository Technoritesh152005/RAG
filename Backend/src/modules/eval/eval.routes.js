import { z } from "zod";
import prisma from "../../lib/prisma.js";
import { authenticateMiddleware } from "../auth/auth_middleware.js";
import {
  putEvalTestCase,
  getAllEvalTestCases,
  deleteEvalCase,
  runEvalTestCases,
  runSingleCase,
  getEvalRuns,
  getEvalRunDetail,
} from "./eval.service.js";

const caseSchema = z.object({
  question: z.string().min(3),
  expectedPageUrls: z.array(z.string()).min(1),
  expectedKeyFacts: z.array(z.string()).min(1),
});

async function verifyWorkspaceOwership(workspaceId, userId) {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      userId,
    },
  });
  if (!workspace) throw new Error("Workspace not found");
}

async function evaluationAccess(request) {
  const role = request.user?.app_metadata?.role?.toLowerCase();

  if (role !== "developer" && role !== "admin") {
    const error = new Error("Developer or admin Access is required for this");
    error.statusCode = 403;
    throw error;
  }
}

async function requireEvalAccess(request) {
  evaluationAccess(request);

  verifyWorkspaceOwership(request.params.workspaceId, request.user.id);
}
function sendRouteError(reply, error, fallbackStatusCode) {
  return reply
    .status(error.statusCode || fallbackStatusCode)
    .send({ error: error.message });
}

export async function evalRoutes(fastify) {
  fastify.addHook("preHandler", authenticateMiddleware);

  //get evaluation test cases(qna)
  fastify.get("/:workspaceId/eval/cases", async (request, reply) => {
    try {
      await requireEvalAccess(request);

      const evalCases = await getAllEvalTestCases(request.params.workspaceId);
      return reply.send({ evalCases });
    } catch (error) {
      return sendRouteError(reply, error, 404);
    }
  });
  //create evaluationTestCase
  fastify.post("/:workspaceId/eval/cases", async (request, reply) => {
    try {
      requireEvalAccess(request);
      const body = caseSchema.parse(request.body);
      const createdEvalCases = await putEvalTestCase({
        workspaceId: request.params.workspaceId,
        question: body.question,
        expectedKeyFacts: body.expectedKeyFacts,
        expectedPageUrls: body.expectedPageUrls,
      });

      return reply.status(200).send({ eval: createdEvalCases });
    } catch (error) {
      return sendRouteError(reply, error, 400);
    }
  });

  //delete evaluation test cases
  fastify.delete("/:workspaceId/eval/cases/:caseId", async (request, reply) => {
    try {
      await requireEvalAccess(request);

      const result = deleteEvalCase(
        request.params.caseId,
        request.params.workspaceId,
      );

      if (result.length === 0) {
        return reply
          .status(404)
          .send({ error: "No Test case found for this id to delete" });
      }
      return reply.send({
        message: "Evaluation case deleted",
      });
    } catch (error) {
      sendRouteError(reply, error, 404);
    }
  });

  //run evaluation testcases
  fastify.post("/:workspaceId/eval/run", async (request, reply) => {
    try {
      await verifyEvalAccess(request);

      const body = request.body || {};
      const label = body.label || "unlabeled";

      const run = await runEvalTestCases(request.params.workspaceId, label);

      return reply.send({ run });
    } catch (error) {
      sendRouteError(reply, error, 400);
    }
  });

  // Get evaluation run history
  fastify.get("/:workspaceId/eval/runs", async (request, reply) => {
    try {
      await verifyEvalAccess(request);

      const runs = await getEvalRuns(request.params.workspaceId);

      return reply.send({ runs });
    } catch (error) {
      return sendRouteError(reply, error, 404);
    }
  });

  // Get one evaluation run with detailed results
  fastify.get("/:workspaceId/eval/runs/:runId", async (request, reply) => {
    try {
      await verifyEvalAccess(request);

      const run = await getEvalRunDetail(
        request.params.runId,
        request.params.workspaceId,
      );

      return reply.send({ run });
    } catch (error) {
      return sendRouteError(reply, error, 404);
    }
  });
}
