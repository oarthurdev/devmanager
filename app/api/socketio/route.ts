import { Server as NetServer } from 'http'
import { NextApiRequest } from 'next'
import { Server as ServerIO } from 'socket.io'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function GET(req: NextApiRequest, res: any) {
  if (!res.socket.server.io) {
    const httpServer: NetServer = res.socket.server as any
    const io = new ServerIO(httpServer, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        methods: ['GET', 'POST'],
        credentials: true
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
      console.log('New client connected')

      socket.on('join_room', (roomId) => {
        socket.join(roomId)
        console.log(`Client joined room: ${roomId}`)
      })

      socket.on('leave_room', (roomId) => {
        socket.leave(roomId)
        console.log(`Client left room: ${roomId}`)
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
          socket.emit('error', { message: 'Failed to send message' })
        }
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected')
      })
    })

    res.socket.server.io = io
  }

  res.end()
}