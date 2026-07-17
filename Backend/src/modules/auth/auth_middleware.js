import {verifyToken} from './auth_service.js'

export async function authenticateMiddleware(request , reply){

    try{

        const authReqHeader =  request.headersauthorization
        console.log(request.headers)
        console.log(request.headers.authorization)
        if(!authReqHeader || !authReqHeader.startsWith('Bearer')){
            return reply.status(400).send({error:"Token is not provided"})
        }

        const token = authReqHeader.split(' ')[1]
        const user = verifyToken(token)

        request.user = user
    }catch(error){
        return reply.status(401).send({error:"Error occured during authenticating from middleware"})
    }
}