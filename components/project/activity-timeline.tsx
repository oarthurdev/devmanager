"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
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
} from "lucide-react"

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

interface ActivityTimelineProps {
  projectId: string
}

export function ActivityTimeline({ projectId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from("project_activities")
        .select(`
          *,
          profiles (
            full_name,
            is_admin
          )
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setActivities(data)
      }
      setIsLoading(false)
    }

    fetchActivities()

    // Subscribe to new activities
    const channel = supabase
      .channel(`project_activities:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_activities",
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          setActivities((current) => [payload.new as Activity, ...current])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "comment":
        return <MessageSquare className="w-5 h-5" />
      case "status_change":
        return <Settings className="w-5 h-5" />
      case "file_upload":
        return <Upload className="w-5 h-5" />
      case "file_download":
        return <Download className="w-5 h-5" />
      case "task_complete":
        return <CheckCircle2 className="w-5 h-5" />
      case "task_create":
        return <FileText className="w-5 h-5" />
      case "deadline_update":
        return <Calendar className="w-5 h-5" />
      default:
        return <Clock className="w-5 h-5" />
    }
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
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Atividades do Projeto</h3>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 pb-4 border-b last:border-0"
            >
              <div className="mt-1 p-2 bg-primary/10 rounded-full">
                {getActivityIcon(activity.type)}
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
                    {format(new Date(activity.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                <p className="text-sm">{activity.description}</p>
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {activity.type === "status_change" && (
                      <div className="flex items-center gap-2">
                        <span>
                          {activity.metadata.old_status} →{" "}
                          {activity.metadata.new_status}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}