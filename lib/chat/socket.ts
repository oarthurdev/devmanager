import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function initializeChat(roomId: string) {
  const channel = supabase.channel(`room:${roomId}`, {
    config: {
      broadcast: {
        self: true
      }
    }
  })

  channel
    .on('broadcast', { event: 'message' }, ({ payload }) => {
      if (typeof payload.callback === 'function') {
        payload.callback(payload.message)
      }
    })
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}

export async function sendMessage(roomId: string, content: string, type: string = 'text', metadata: any = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
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
        user_id,
        profiles!chat_messages_user_id_fkey (
          full_name
        )
      `)
      .single()

    if (error) throw error

    // Broadcast the message to all subscribers
    await supabase.channel(`room:${roomId}`).send({
      type: 'broadcast',
      event: 'message',
      payload: { message }
    })

    return message
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

export function subscribeToMessages(callback: (message: any) => void) {
  const subscription = supabase
    .channel('chat_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

export default supabase