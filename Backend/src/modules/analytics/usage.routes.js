import {authenticateMiddleware} from '../../middleware/auth.middleware.js'
import {logUsage,getUsageStats} from './usage.service.js'
import prisma from '../../lib/prisma.js'

export async function registerUsageRoutes(fastify, options) {
    fastify.addHook('preHandler', authenticateMiddleware)

    fastify.get('/:workspaceId/usage', async(request,reply)=>{

        try{
            //check workspace exists

            const workspace = await prisma.workspace.findUnique({
                where:{
                    id: request.params.workspaceId,
                    userId:request.user.id
                }
            })
            if(!workspace){
                return reply.status(404).send({error:'Workspace Not Found'})
            }

            await getUsageStats(request.params.workspaceId).then((stats)=>{
                return reply.status(200).send(stats)
            }).catch((err)=>{
                console.error("Error fetching usage stats:", err);
                return reply.status(500).send({error:'Internal Server Error'})
            })

        }catch(error){
           return reply.status(500).send({ error: err.message })   
        }
    })

    
}