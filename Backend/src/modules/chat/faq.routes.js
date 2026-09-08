import {authenticateMiddleware} from '../auth/auth_middleware.js'
import {getFAQs, generateFAQ} from '../chat/faq.service.js'

export async function faqRoutes(){

    fastify.addHook('preHandler', authenticateMiddleware)

    //get all faqs of a workspace
    fastify.get('/:workspaceId/faqs', async(request,reply)=>{
        const workspaceId = request.params.workspaceId
        if(!workspaceId)return reply.code(404).send(
            {error:'Please provide the workspaceId'}
        )
        try{
            const faqs = await getFAQs(workspaceId,request.user.id)
            return reply.send({faqs})
        }catch(error){
            return reply.status(404).send({ error: error.message })
        }
    })

    //post manually faqs trigger
    fastify.post('/:workspaceId/faqs/generate', async(request,reply)=>{

        try{
             generateFAQ(request.params.workspaceId).catch((err)=>{
                console.error(`Error occured while truggering the faqs: ${err.message}`)
             })
              return reply.send({
            message: 'FAQ generation started in background'
            })
        }catch(error){
            return reply.status(400).send({ error: error.message })
        }
    })
}