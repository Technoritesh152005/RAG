import {verifyToken} from './auth_service.js'

export async function authenticateMiddleware(request , reply){

    if (process.env.NODE_ENV !== 'production' && process.env.LOCAL_AUTH_BYPASS === 'true') {
        request.user = {
            id: process.env.LOCAL_USER_ID || 'local-dev-user',
            app_metadata: { role: 'admin' }
        }
        return
    }

    try{

        //we extract the authorization header from the request to verify the token
        const authReqHeader =  request.headers.authorization
        console.log(request.headers)
        console.log(request.headers.authorization)
        if(!authReqHeader || !authReqHeader.startsWith('Bearer')){
            return reply.status(400).send({error:"Token is not provided"})
        }

        const token = authReqHeader.split(' ')[1]
        const user = await verifyToken(token)

        request.user = user
    }catch(error){
        return reply.status(401).send({error:"Error occured during authenticating from middleware"})
    }
}