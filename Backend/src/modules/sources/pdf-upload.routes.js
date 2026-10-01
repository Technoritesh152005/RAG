import { z } from "zod";
import crypto from "crypto";
import { authenticateMiddleware } from "../auth/auth_middleware";
import {
  createSignedUploadUrl,
  checkPdfExist,
  deletePdf,
} from "./source.service";
import { addIngestionQueue } from "../jobs/ingestion.job";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; //25 mb
const initSchema = z.object({
  filename: z.string().min(1),
  sizeBytes: z.number().positive(),
  mimeType: z.literal("application/pdf"),
});
export async function registerPdfUploadRoutes(fastify) {
  fastify.addHook("preHandler", authenticateMiddleware);

  //client ask a place to upload a url=> generate a signedupload url
  fastify.post(
    "/:workspaceId/sources/pdf/init-upload",
    async (request, response) => {
      try {
        const workspaceId = request.params.workspaceId;
        //check whetehr the requested user only has this workspace
        const workspace = await prisma.workspace.findFirst({
          where: {
            id: workspaceId,
            userId: request.use.Id,
          },
        });
        if (!workspace)
          return reply.status(400).send({
            error:
              "Workspace not found / You are not eligible to perform this operation",
          });
        //validate the given data in schema
        const body = initSchema.parse(request.body);
        if (body.sizeBytes > MAX_SIZE_BYTES) {
          return reply.status(400).send({
            error: `File exceeds the ${MAX_SIZE_BYTES / 1024 / 1024}MB limit`,
          });
        }

        const sourceId = crypto.randomUUID();
        const storagePath = `${workspaceId}/${sourceId}.pdf`;

        const source = await prisma.source.create({
          data: {
            id: sourceId,
            url: body.filename,
            sourceType: "PDF",
            storagePath,
            workspaceId,
            status: "PENDING",
          },
        });

        const { signedUrl, token } = await createSignedUploadUrl(storagePath);

        return reply.status(200).send({
          sourceId,
          signedUrl,
          token,
          storagePath,
          bucket: "pdf-bucket-sources",
        });
      } catch (error) {
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  //client confirm the direct upload finished
  fastify.post(
    "/:workspaceId/sources/pdf/:sourceId/confirm-upload",
    async (request, reply) => {
      try {
        const source = await prisma.source.findFirst({
          where: {
            id: request.params.sourceId,
            workspaceId: request.params.workspaceId,
            workspace: { userId: request.user.id },
          },
        });
        if (!source)
          return reply.status(404).send({ error: "Source not found" });

        //verify that whether pdf is uploaded
        const exist = await checkPdfExist(source.storagePath);
        if (!exist) {
          //delete the metadata
          await prisma.source.delete({
            where: {
              id: source.Id,
            },
          });
          return reply.status(400).send({
            error:
              "Upload was not found in storage . please try uploading again",
          });
        }

        //if exist add in ingestion job to further chunk this opration nd perform operation
        await addIngestionJob({
            sourceId:source.id,
            workspaceId:request.params.workspaceId,
            url:source.url,
            sourceType:'PDF',
            storagePath:source.storagePath
        })

        return reply.send({ message: 'Upload confirmed, indexing started', source })
      } catch (error) {
        
      }
    },
  );
}
