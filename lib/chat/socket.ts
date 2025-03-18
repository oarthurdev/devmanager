import { io } from 'socket.io-client'
import { createClient } from '@/lib/supabase/client'

const socket = io(process.env.NEXT_PUBLIC_APP_URL || '', {
  autoConnect: false,
  path: '/api/socketio'
})

export async function initializeChat(roomId: string) {
  const supabase = createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  socket.auth = { token: session.access_token }
  socket.connect()
  
  socket.emit('join_room', roomId)

  return () => {
    socket.emit('leave_room', roomId)
    socket.disconnect()
  }
}

export function sendMessage(roomId: string, content: string, type: string = 'text', metadata: any = {}) {
  socket.emit('message', {
    roomId,
    content,
    type,
    metadata
  })
}

export function subscribeToMessages(callback: (message: any) => void) {
  socket.on('message', callback)
  return () => socket.off('message', callback)
}

export default socket