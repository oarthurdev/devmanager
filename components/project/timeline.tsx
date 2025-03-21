"use client"

import { useEffect, useRef, useState } from 'react'
import { Timeline } from 'vis-timeline'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import {
  Clock,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertCircle,
  User,
  Shield,
  Calendar,
  Settings,
  Upload,
  Download
} from 'lucide-react'

interface Activity {
  id: string
  type: string
  description: string
  created_at: string
  metadata: any
  profiles: {
    full_name: string
    is_admin: boolean
  }
}

interface Task {
  id: string
  project_id: string
  title: string
  created_at: string
  deadline: string
  status: string
}

interface ProjectTimelineProps {
  projectId: string
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineInstance = useRef<Timeline | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        // Fetch project details
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        // Fetch tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('deadline', { ascending: true })

        // Fetch activities
        const { data: activities } = await supabase
          .from('project_activities')
          .select(`
            *,
            profiles (
              full_name,
              is_admin
            )
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: true })

        if (!project || !tasks || !activities) return

        // Create timeline items
        const items = [
          // Project start
          {
            id: 'project_start',
            content: 'Início do Projeto',
            start: new Date(project.created_at),
            type: 'point',
            className: 'timeline-milestone',
          },
          // Project deadline
          {
            id: 'project_deadline',
            content: 'Prazo Final',
            start: new Date(project.deadline),
            type: 'point',
            className: 'timeline-deadline',
          },
          // Tasks
          ...tasks.map((task) => ({
            id: `task_${task.id}`,
            content: task.title,
            start: new Date(task.created_at),
            end: new Date(task.deadline),
            className: `timeline-task timeline-task-${task.status}`,
            group: 1,
          })),
          // Activities
          ...activities.map((activity) => ({
            id: `activity_${activity.id}`,
            content: activity.description,
            start: new Date(activity.created_at),
            type: 'point',
            className: `timeline-activity timeline-activity-${activity.type}`,
            group: 2,
          })),
        ]

        // Create groups
        const groups = [
          { id: 1, content: 'Tarefas' },
          { id: 2, content: 'Atividades' },
        ]

        // Configure timeline
        const options = {
          height: '400px',
          min: new Date(project.created_at),
          max: new Date(project.deadline),
          zoomMin: 1000 * 60 * 60 * 24, // One day
          zoomMax: 1000 * 60 * 60 * 24 * 365, // One year
          orientation: 'top',
          stack: true,
          showCurrentTime: true,
          format: {
            minorLabels: {
              minute: 'HH:mm',
              hour: 'HH:mm',
              day: 'D',
              week: 'w',
              month: 'MMM',
              year: 'YYYY'
            },
            majorLabels: {
              minute: 'DD/MM/YYYY',
              hour: 'DD/MM/YYYY',
              day: 'MMMM YYYY',
              week: 'MMMM YYYY',
              month: 'YYYY',
              year: ''
            }
          }
        }

        // Initialize timeline
        if (timelineRef.current && !timelineInstance.current) {
          timelineInstance.current = new Timeline(
            timelineRef.current,
            items,
            groups,
            options
          )

          // Add click handler
          timelineInstance.current.on('select', (properties) => {
            const selectedId = properties.items[0]
            if (selectedId) {
              const item = items.find((i) => i.id === selectedId)
              if (item) {
                console.log('Selected item:', item)
                // Here you could show a modal or tooltip with more details
              }
            }
          })
        }
      } catch (error) {
        console.error('Error fetching timeline data:', error)
      }
    }

    fetchTimelineData()

    // Subscribe to new activities
    const channel = supabase
      .channel(`project_activities:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_activities',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          setActivities((current) => [payload.new as Activity, ...current])
        }
      )
      .subscribe()

    // Subscribe to new tasks
    const taskChannel = supabase
      .channel(`tasks:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          setTasks((current) => [payload.new as Task, ...current])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(taskChannel)
    }
  }, [projectId, supabase])

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-primary/20 rounded w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-primary/10 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Linha do Tempo do Projeto</h3>
      <div ref={timelineRef} />
      <ScrollArea className="h-[400px] pr-4 mt-4">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 pb-4 border-b last:border-0"
            >
              <div className="mt-1 p-2 bg-primary/10 rounded-full">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {activity.profiles.full_name}
                  </span>
                  {activity.profiles.is_admin ? (
                    <span className="flex items-center gap-1 text-sm text-primary">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="w-3 h-3" />
                      Usuário
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
                <p className="text-sm">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}
