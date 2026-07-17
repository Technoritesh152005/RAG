import {createClient} from '@supabase/supabase-js'

const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
)

export async function verifyToken (token){
  const  {data : {user} , error} = await supabaseClient.auth.getUser(token)

  if(error || !user){
    throw new Error('Invalid or Expired Token')
  }
  return user
}

// socket.io auth middleware
io.use(async (socket, next) => {
  try {
    // taking the supabase auth so that during chatting authentication is proved
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('No token'))
      // we verify the supabase token and we get user details
    const user = await verifyToken(token)
    socket.user = user
    next()
  } catch (err) {
    next(new Error('Unauthorized'))
  }
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.user.id)

  socket.on('join:workspace', (workspaceId) => {
    socket.join(workspaceId)
    console.log(`User ${socket.user.id} joined workspace ${workspaceId}`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.user.id)
  })
})
// export io for use in other modules
export { io }

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