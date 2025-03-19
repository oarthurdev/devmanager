"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { subscribeToPresence } from '@/lib/presence'
import { createClient } from '@/lib/supabase/client'

interface UserPresence {
  user_id: string
  status: 'online' | 'offline'
  last_seen: string
  profiles?: {
    full_name: string
  }
}

interface UserPresenceListProps {
  projectId: string
}

export function UserPresenceList({ projectId }: UserPresenceListProps) {
  const [presences, setPresences] = useState<UserPresence[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchPresences = async () => {
        try {
          // Obter os IDs do dono do projeto
          const projectOwnerQuery = supabase
            .from('projects')
            .select('user_id')
            .eq('id', projectId)
      
          // Obter os IDs dos membros da equipe (assumindo que a relação é via user_id)
          const teamMembersQuery = supabase
            .from('team_members')
            .select('user_id')  // Agora filtrando apenas os user_ids dos membros
      
          // Espera pelas duas consultas
          const [projectOwnerResult, teamMembersResult] = await Promise.all([
            projectOwnerQuery,
            teamMembersQuery,
          ])
      
          // Extrair os IDs
          const userIds = [
            projectOwnerResult.data[0]?.user_id,  // ID do dono do projeto
            ...teamMembersResult.data.map(member => member.user_id)  // IDs dos membros da equipe
          ]
      
          // Buscar as presenças usando os IDs obtidos
          const { data } = await supabase
            .from('user_presence')
            .select(`
              *,
              profiles (
                full_name
              )
            `)
            .in('user_id', userIds)
      
          if (data) {
            setPresences(data)
          }
        } catch (error) {
          console.error('Erro ao buscar as presenças:', error)
        }
      }               

    fetchPresences()

    const unsubscribe = subscribeToPresence((updates) => {
      setPresences((current) =>
        current.map((presence) =>
          updates.find((u) => u.user_id === presence.user_id)
            ? { ...presence, ...updates.find((u) => u.user_id === presence.user_id) }
            : presence
        )
      )
    })

    return () => {
      unsubscribe()
    }
  }, [projectId, supabase])

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Usuários Online</h4>
      <div className="space-y-1">
        {presences.map((presence) => (
          <div
            key={presence.user_id}
            className="flex items-center justify-between py-1"
          >
            <span className="text-sm">{presence.profiles?.full_name}</span>
            <Badge
              variant={presence.status === 'online' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {presence.status === 'online' ? 'Online' : 'Offline'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}