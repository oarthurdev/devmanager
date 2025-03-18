if (typeof window === 'undefined') {
  const { Server } = require('socket.io');
}
import { createClient } from '@/lib/supabase/server'

const io = new Server({
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL,
    methods: ['GET', 'POST']
  }
})

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) {
    return next(new Error('Authentication error'))
  }

  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return next(new Error('Authentication error'))
    }

    socket.data.user = user
    next()
  } catch (error) {
    next(new Error('Authentication error'))
  }
})

io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => {
    socket.join(roomId)
  })

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId)
  })

  socket.on('message', async (data) => {
    try {
      const supabase = createClient()
      const { roomId, content, type, metadata } = data

      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: socket.data.user.id,
          content,
          type,
          metadata
        })
        .select(`
          id,
          content,
          type,
          metadata,
          created_at,
          profiles (
            full_name
          )
        `)
        .single()

      if (error) throw error

      io.to(roomId).emit('message', message)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  })
})

export const runtime = 'edge'

export default function handler(req, res) {
  if (!res.socket.server.io) {
    res.socket.server.io = io
  }
  res.end()
}