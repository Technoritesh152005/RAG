import Fastify, { fastify } from 'fastify'
import cors from '@fastify/cors'
import {Server} from 'socket.io'
import createServer from 'http'
import {registerWorkspaceRoute} from './modules/workspace/workspace_routes.js'
import dotenv from 'dotenv'

dotenv.config()

const fastify = Fastify({ logger: true })

await fastify.register(cors,{
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
})

fastify.register(registerWorkspaceRoute , {prefix:'/api/workspace'})

// create http server for socket.io
const httpServer = createServer(fastify.server)

const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  })