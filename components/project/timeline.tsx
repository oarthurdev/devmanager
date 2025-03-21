"use client"

import { useEffect, useRef } from 'react'
import { Timeline } from 'vis-timeline'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface TimelineProps {
  projectId: string
}

export function ProjectTimeline({ projectId }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineInstance = useRef<Timeline | null>(null)
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
          .select('*')
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

    // Cleanup
    return () => {
      if (timelineInstance.current) {
        timelineInstance.current.destroy()
        timelineInstance.current = null
      }
    }
  }, [projectId, supabase])

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Linha do Tempo do Projeto</h3>
      <div ref={timelineRef} />
    </Card>
  )
}
