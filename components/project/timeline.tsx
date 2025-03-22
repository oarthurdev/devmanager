'use client'

import { useEffect, useRef, useState } from 'react'
import { Timeline, DataItem, DataGroup, TimelineOptions } from 'vis-timeline'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import {
  Clock,
  Shield,
  User,
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

interface Project {
  id: string
  created_at: string
  deadline: string
}

interface ProjectTimelineProps {
  projectId: string
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineInstance = useRef<Timeline | null>(null)

  const [activities, setActivities] = useState<Activity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: project }, { data: tasks }, { data: activities }] = await Promise.all([
          supabase.from('projects').select('*').eq('id', projectId).single(),
          supabase.from('tasks').select('*').eq('project_id', projectId).order('deadline', { ascending: true }),
          supabase
            .from('project_activities')
            .select(`
              *,
              profiles (
                full_name,
                is_admin
              )
            `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: true }),
        ])

        if (!project || !tasks || !activities) return

        setProject(project)
        setTasks(tasks)
        setActivities(activities)
        initializeTimeline(project, tasks, activities)
      } catch (error) {
        console.error('Erro ao buscar dados do projeto:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Supabase Realtime
    const activityChannel = supabase
      .channel(`project_activities:${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'project_activities',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        setActivities((prev) => [payload.new as Activity, ...prev])
      })
      .subscribe()

    const taskChannel = supabase
      .channel(`tasks:${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        setTasks((prev) => [payload.new as Task, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(activityChannel)
      supabase.removeChannel(taskChannel)
    }
  }, [projectId])

  const initializeTimeline = (
    project: Project,
    tasks: Task[],
    activities: Activity[]
  ) => {
    if (!timelineRef.current || timelineInstance.current) return

    const items: DataItem[] = [
      {
        id: 'start',
        content: 'Início do Projeto',
        start: new Date(project.created_at),
        type: 'point',
        className: 'timeline-milestone',
      },
      {
        id: 'deadline',
        content: 'Prazo Final',
        start: new Date(project.deadline),
        type: 'point',
        className: 'timeline-deadline',
      },
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        content: task.title,
        start: new Date(task.created_at),
        end: new Date(task.deadline),
        className: `timeline-task timeline-task-${task.status}`,
        group: 1,
      })),
      ...activities.map((activity) => ({
        id: `activity-${activity.id}`,
        content: activity.description,
        start: new Date(activity.created_at),
        type: 'point',
        className: `timeline-activity timeline-activity-${activity.type}`,
        group: 2,
      })),
    ]

    const groups: DataGroup[] = [
      { id: 1, content: 'Tarefas' },
      { id: 2, content: 'Atividades' },
    ]

    const options: TimelineOptions = {
      height: '400px',
      min: new Date(project.created_at),
      max: new Date(project.deadline),
      zoomMin: 1000 * 60 * 60 * 24,
      zoomMax: 1000 * 60 * 60 * 24 * 365,
      orientation: 'top',
      stack: true,
      showCurrentTime: true,
    }

    timelineInstance.current = new Timeline(timelineRef.current, items, groups, options)

    timelineInstance.current.on('select', ({ items }) => {
      const selectedId = items[0]
      const item = items && selectedId && items.find((i) => i.id === selectedId)
      if (item) console.log('Item selecionado:', item)
    })
  }

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
                  <span className="font-medium">{activity.profiles.full_name}</span>
                  {activity.profiles.is_admin ? (
                    <span className="flex items-center gap-1 text-sm text-primary">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="w-3 h-3" /> Usuário
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
