import { createWorkspace, deleteWorkspace, getWorkspaceById, getWorkspace, updateWorkspace } from './workspace_service.js'
import z from 'zod'
import { authenticateMiddleware } from '../auth/auth_middleware.js'

// zod is a validation library

const createSchema = z.object({
    name: z.string().min(1).max(50),
    description: z.string().min(1).max(200).optional()
})

export async function registerWorkspaceRoute(fastify) {

    fastify.addHook('preHandler', authenticateMiddleware)

    // get all workspace for the user
    fastify.get('/', async (request, reply) => {
        try {
            const workspace = getWorkspace(request.user.id)
            if (!workspace) {
                return reply.send({ error: 'Not able to fetch user workspace' })
            }
            return reply.send({ workspace })
        } catch (err) {
            reply.status(500).send({ error: err.message })
        }
    })

    // get single workspace
    fastify.get('/:id', async (request, reply) => {
        try {
            const workspace = getWorkspace(request.user.id, request.params.id)
            if (!workspace) {
                return reply.send({ error: 'Not able to fetch user workspace' })
            }
            return reply.send({ workspace })
        } catch (err) {
            reply.status(400).send({ error: err.message })
        }
    })

    // create a new Workspace
    fastify.post('/', async (request, reply) => {

        try {
            const data = await createSchema(request.body)
            const workspace = await createWorkspace(
                {
                    ...data,
                    userId: request.user.id
                }
            )
            return reply.status(201).send({ workspace })
        } catch (err) {
            return reply.status(400).send({ error: err.message })
        }
    })

    fastify.delete('/:id', async (request, reply) => {

        try {
            await deleteWorkspace(request.user.id, request.params.id)
            return reply.status(200).send({ message: 'Workspace Deleted' })
        } catch (error) {
            return reply.status(404).send({ error: err.message })
        }

    })

    // update the workspace
    fastify.patch('/:id', async (request, reply) => {
        try {
            const workspace = await updateWorkspace(
                request.params.id,
                request.user.id,
                request.body
            )
            return reply.send({ workspace })
        } catch (err) {
            return reply.status(400).send({ error: err.message })
        }
    })
}