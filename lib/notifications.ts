import { createClient } from '@/lib/supabase/client'

export async function createNotification({
  userId,
  type,
  title,
  message,
  projectId,
  metadata = {}
}: {
  userId: string
  type: string
  title: string
  message: string
  projectId?: string
  metadata?: Record<string, any>
}) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        project_id: projectId,
        metadata,
        read: false
      })

    if (error) throw error
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}