"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { ProjectHeader } from "./components/project-header"
import { ProjectInfo } from "./components/project-info"
import { ProjectComments } from "./components/project-comments"
import ProjectAttachments from "./components/project-attachments"
import ProjectTasks from "./components/project-tasks"
import { ChatWindow } from "@/components/chat/chat-window"
import { UserPresenceList } from "@/components/chat/user-presence"
import { ProjectTimeline } from "@/components/project/timeline"
import { createNotification } from "@/lib/notifications"

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<{ name: string; level: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatRoom, setChatRoom] = useState<{ id: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        setCurrentUserId(user.id)

        // Get user's role in the team assigned to this project
        const { data: teamMember } = await supabase
          .from("team_members")
          .select(`
            roles (
              name,
              level
            )
          `)
          .eq("user_id", user.id)
          .eq("status", "active")
          .single()

        if (teamMember?.roles) {
          setUserRole(teamMember.roles)
        }

        // Check if user is admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single()

        setIsAdmin(profile?.is_admin || false)

        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select(`
            *,
            profiles (
              full_name,
              email,
              phone,
              document,
              company_name
            )
          `)
          .eq("id", params.id)
          .single()

        if (projectError) throw projectError

        // Check if user has access to the project
        const { data: teamProject } = await supabase
          .from("team_projects")
          .select("team_id")
          .eq("project_id", params.id)
          .single()

        if (teamProject) {
          const { data: userTeam } = await supabase
            .from("team_members")
            .select("team_id")
            .eq("user_id", user.id)
            .eq("team_id", teamProject.team_id)
            .single()

          if (!userTeam && !profile?.is_admin && projectData.user_id !== user.id) {
            throw new Error("Você não tem permissão para ver este projeto")
          }
        }

        setProject(projectData)

        // Fetch or create chat room
        const { data: existingRoom } = await supabase
          .from("chat_rooms")
          .select("id")
          .eq("project_id", params.id)
          .single()

        if (existingRoom) {
          setChatRoom(existingRoom)
        } else {
          const { data: newRoom } = await supabase
            .from("chat_rooms")
            .insert({
              project_id: params.id,
              name: `Chat do Projeto: ${projectData.name}`,
              type: "project"
            })
            .select()
            .single()

          if (newRoom) {
            setChatRoom(newRoom)
          }
        }

        // Fetch comments
        const { data: commentsData } = await supabase
          .from("project_comments")
          .select(`
            *,
            profiles (
              full_name,
              is_admin
            )
          `)
          .eq("project_id", params.id)
          .order("created_at", { ascending: false })

        if (commentsData) {
          setComments(commentsData)
        }
      } catch (err: any) {
        setError(err.message || "Erro ao carregar dados do projeto")
        console.error("Error fetching project data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, router, supabase])

  const updateProjectStatus = async (newStatus: string) => {
    if (!project || !userRole || userRole.level < 3) return

    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", project.id)

      if (error) throw error

      setProject(prev => ({ ...prev, status: newStatus }))

      const { error: commentError } = await supabase
        .from("project_comments")
        .insert({
          project_id: project.id,
          profile_id: currentUserId,
          content: `Status do projeto alterado para: ${newStatus}`,
          type: "system"
        })

      if (commentError) throw commentError

      await createNotification({
        userId: project.user_id,
        type: 'status_change',
        title: 'Status do Projeto Atualizado',
        message: `O status do seu projeto foi atualizado para: ${
          newStatus === 'completed' ? 'Concluído' :
          newStatus === 'in_progress' ? 'Em Progresso' :
          newStatus === 'cancelled' ? 'Cancelado' :
          'Pendente'
        }`,
        projectId: project.id,
        metadata: {
          old_status: project.status,
          new_status: newStatus,
          updated_by: currentUserId,
          is_admin: isAdmin
        }
      })
    } catch (error) {
      console.error("Error updating project status:", error)
    }
  }

  const addComment = async (content: string) => {
    if (!project || !currentUserId) return

    try {
      const { data: comment, error } = await supabase
        .from("project_comments")
        .insert({
          project_id: project.id,
          profile_id: currentUserId,
          content: content.trim(),
          type: isAdmin ? "admin" : "user"
        })
        .select(`
          *,
          profiles (
            full_name,
            is_admin
          )
        `)
        .single()

      if (error) throw error

      setComments(prev => [comment, ...prev])

      // Notify relevant users
      if (isAdmin && project.user_id !== currentUserId) {
        await createNotification({
          userId: project.user_id,
          type: 'admin_comment',
          title: 'Novo Comentário do Administrador',
          message: `Um administrador comentou em seu projeto: "${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
          projectId: project.id,
          metadata: {
            comment_id: comment.id,
            admin_id: currentUserId
          }
        })
      }
      else if (!isAdmin) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_admin', true)

        if (admins) {
          for (const admin of admins) {
            await createNotification({
              userId: admin.id,
              type: 'user_comment',
              title: 'Novo Comentário do Cliente',
              message: `${project.profiles.full_name} comentou no projeto "${project.name}": "${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
              projectId: project.id,
              metadata: {
                comment_id: comment.id,
                user_id: currentUserId
              }
            })
          }
        }
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    }
  }

  const deleteProject = async () => {
    if (!project || !isAdmin) return

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)

      if (error) throw error

      router.push("/dashboard/projects")
    } catch (error) {
      console.error("Error deleting project:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-2">Erro</h2>
        <p className="text-muted-foreground">{error || "Projeto não encontrado"}</p>
      </div>
    )
  }

  const canEdit = isAdmin || project.user_id === currentUserId || userRole?.level >= 2

  return (
    <div className="space-y-8">
      <ProjectHeader
        project={project}
        canEdit={canEdit}
        isAdmin={isAdmin}
        userRole={userRole}
        onUpdateStatus={updateProjectStatus}
        onDelete={deleteProject}
      />

      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6 col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
              <TabsTrigger value="tasks">Tarefas</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="comments">Comentários</TabsTrigger>
              <TabsTrigger value="attachments">Anexos</TabsTrigger>
              <TabsTrigger value="activity">Atividades</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Descrição</h3>
                <p className="text-muted-foreground">{project.description}</p>
              </div>

              {project.requirements && (
                <div>
                  <h3 className="font-semibold mb-2">Requisitos</h3>
                  <div className="prose prose-sm max-w-none">
                    {project.requirements}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline">
              <ProjectTimeline projectId={project.id} />
            </TabsContent>

            <TabsContent value="tasks">
              <ProjectTasks projectId={project.id} canEdit={canEdit} />
            </TabsContent>

            <TabsContent value="chat">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  {chatRoom && (
                    <ChatWindow projectId={project.id} roomId={chatRoom.id} />
                  )}
                </div>
                <div>
                  <UserPresenceList projectId={project.id} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comments">
              <ProjectComments
                comments={comments}
                canComment={canEdit}
                onAddComment={addComment}
              />
            </TabsContent>

            <TabsContent value="attachments">
              <ProjectAttachments projectId={project.id} canEdit={canEdit} />
            </TabsContent>

            <TabsContent value="activity">
              <ProjectTimeline projectId={project.id} />
            </TabsContent>
          </Tabs>
        </Card>

        <div className="space-y-6">
          <ProjectInfo project={project} userRole={userRole} />
        </div>
      </div>
    </div>
  )
}