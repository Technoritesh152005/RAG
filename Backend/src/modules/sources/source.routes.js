import {
    
    reIndexSource,
    deleteSource,
    getSource,
    addSource
} from '../sources/source.js'
import {z} from 'zod'
import {authenticateMiddleware} from '../auth/auth_middleware.js'

const addSourceSchema = z.object({
    url: z.string().url('Must be a valid URL')
  })

export async function registerSourceRoutes(fastify){

    //adding authentication middleware to all the routes in this file of our fastify backend server
    fastify.addHook('preHandler', authenticateMiddleware)

    // gets all the source from this workspace
    fastify.get('/:workspaceId/sources' , async(request,reply)=>{

        try{
            const source = await getSource(
                request.params.workspaceId,
                request.user.id
            )
            return reply.code(200).send({source})
        }catch(error){
            return reply.status(404).send({ error: error.message })
        }
    } )

    // post source in workspace
    fastify.post('/:workspaceId/sources' , async(request, reply)=>{
        try{
            console.log('Putting source in workspace: this is the request Body:='+request.body)
            const {url} = addSourceSchema.parse(request.body)

            const source = await addSource({
                url:url,
                workspaceId:request.params.workspaceId,
                userId : request.user.id
            })
            return reply.code(201).send({source})
        }catch(error){
            // means someone tried to paste same source url
            if(error.code ==='P2002'){
                return reply.code(409).send({error:'Url already exist in this worspace. Try other url or create other workspace for this source url'})
            }
            return reply.status(400).send({ error: err.message })
        }
    })

    fastify.delete('/:workspaceId/sources/:sourceId', async(request,reply)=>{

        try{
            await deleteSource(request.params.sourceId , request.user.id)
            return reply.code(200).send({message:`Source of ${request.params.sourceId} deleted successfully`})
        }catch(error){
            return reply.status(404).send({error:'Source not found'})
        }
    })

    //reindexing/recrawling once again the source url to get the latest content and update the chunks in db
    fastify.post('/:workspaceId/sources/:sourceId/reindex', async (request, reply) => {
        try {
          const source = await reIndexSource(
            request.params.sourceId,
            request.user.id
          )
          return reply.send({ source })
        } catch (err) {
          return reply.status(400).send({ error: err.message })
        }
      })
}