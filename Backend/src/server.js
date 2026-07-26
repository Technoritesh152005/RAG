import Fastify, { fastify } from 'fastify'
import cors from '@fastify/cors'
import {Server} from 'socket.io'
import createServer from 'http'
import {registerWorkspaceRoute} from './modules/workspace/workspace_routes.js'
import dotenv from 'dotenv'
import { verifyToken } from './modules/auth/auth_service.js'
import {registerSourceRoutes} from './modules/sources/source.routes.js'

dotenv.config()

const fastify = Fastify({ logger: true })

await fastify.register(cors,{
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
})

fastify.register(registerWorkspaceRoute , {prefix:'/api/workspace'})
fastify.register(registerSourceRoutes, { prefix: '/api/workspaces' })

// create http server for socket.io
const httpServer = createServer(fastify.server)

const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  })

// socket middleware
io.use(async(socket, next)=>{
  try{
    const token = socket.handshake.auth.token
  if(!token) return next(Error('No Token'))
  const user = await verifyToken(token)
socket.user = user;
next()
  }catch(err){
    next(new Error('Unauthorized'))
  }
})

io.on('connection',(socket)=>{
  console.log('Socket Client connected')

  socket.on('join:workspace',(workspaceId)=>{
    socket.join(workspaceId)
    console.log(`User ${socket.user.id} joined workspace ${workspaceId}`)
  })
})

// start server
const PORT = process.env.PORT || 4000

try {
  await fastify.ready()
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}