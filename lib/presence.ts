import { createClient } from '@/lib/supabase/client'

export async function updatePresence(status: 'online' | 'offline') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return

  try {
    const { data, error } = await supabase
      .from('user_presence')
      .upsert([
        {
          user_id: user.id,
          status: status,
          last_seen: new Date().toISOString(),
          metadata: {}
        }
      ], { onConflict: 'user_id' }) // Garante que, se já existir, o registro será atualizado com base no user_id

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error updating presence:', error)
  }
}

export function subscribeToPresence(callback: (presences: any[]) => void) {
  const supabase = createClient()
  
  const channel = supabase
    .channel('presence_updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      },
      (payload) => {
        callback([payload.new])
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function initializePresence() {
  await updatePresence('online')

  // Update presence on window focus/blur
  window.addEventListener('focus', () => updatePresence('online'))
  window.addEventListener('blur', () => updatePresence('offline'))

  // Update presence before page unload
  window.addEventListener('beforeunload', () => updatePresence('offline'))

  // Periodic presence update
  const interval = setInterval(() => updatePresence('online'), 30000)

  return () => {
    window.removeEventListener('focus', () => updatePresence('online'))
    window.removeEventListener('blur', () => updatePresence('offline'))
    window.removeEventListener('beforeunload', () => updatePresence('offline'))
    clearInterval(interval)
    updatePresence('offline')
  }
}