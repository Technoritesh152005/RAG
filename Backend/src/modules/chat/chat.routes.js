import {authenticateMiddleware} from '../auth/auth_middleware.js'
import {getAllMessages,deleteWorkspaceMessage} from './chat.service.js'

export async function chatRoutes(fastify){

    fastify.addHook('authenticationMiddleware', authenticateMiddleware)

    fastify.get('/:workspaceId/messages', async(request,reply)=>{
        try{
            const workspaceId = request.params.workspaceId
            if(!workspaceId)return reply.code(400).send({err:'Workspace id kon tera baap dega?'})
            const messages = await getAllMessages(workspaceId,request.user.id)
            return reply.send({msg:messages})
        }catch(error){
            return reply.code(404).send({msg:error.message})
        }
    })

    //delete chat history
    fastify.delete('/:workspaceId/messages', async(request,reply)=>{

        try{
             const workspaceId = request.params.workspaceId
            if(!workspaceId)return reply.code(400).send({err:'Workspace id kon tera baap dega?'})
            await deleteWorkspaceMessage(workspaceId,request.user.id)
         return reply.send({ message: 'Chat history cleared' })
        }catch(error){
        return reply.status(400).send({ error: err.message })
        }
    })
}