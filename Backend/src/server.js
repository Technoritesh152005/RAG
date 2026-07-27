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

// seperate redis client for subscriber
const subRedis = new Redis(process.env.REDIS_URL)

// whenever some msg comes in source:status channle notify
subRedis.subscribe('source:status', (err)=>{
  if (err) console.error('Redis subscribe error:', err)
    else console.log('Subscribed to source:status channel')
})

// when workerpublish emit status update it
// it returns message in string like workspaceid, chunk and all data from worker
subRedis.on('message', (channel,message)=>{

  if(channel==='source:status'){
    const data = JSON.parse(message)
    console.log(data)

    // emit to clients in workspace room via socket
    // only those in room of socket will receive this messgae and load in frontend
    io.to(data.workspaceId).emit('source:status', {
      sourceId: data.sourceId,
      status: data.status,
      pageCount: data.pageCount,
      chunkCount: data.chunkCount,
      error: data.error
    })
  }
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