"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import {
  Clock,
  Calendar,
  User,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Edit,
  Trash2,
  CreditCard,
  Loader2,
  Shield
} from "lucide-react"

interface Project {
  id: string
  name: string
  description: string
  status: string
  plan: string
  products: string[]
  deadline: string
  user_id: string
  created_at: string
  requirements: string
  customizations: Record<string, any>
  payment_status: string
  payment_details: any
  profiles: {
    full_name: string
    phone: string
    document: string
    company_name?: string
  }
}

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  estimated_hours: number
  deadline: string
  completed_at: string | null
}

interface Comment {
  id: string
  project_id: string
  content: string
  created_at: string
  type?: string
  profiles: {
    full_name: string
    is_admin?: boolean
  }
}

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editStatus, setEditStatus] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!params.id) {
          setError("Project ID not found")
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        setCurrentUserId(user.id)

        // Check if user is admin
        const { data: profileData } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single()

        setIsAdmin(profileData?.is_admin || false)

        // Fetch project details with user info
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select(`
            *,
            profiles (
              full_name,
              phone,
              document,
              company_name
            )
          `)
          .eq("id", params.id)
          .single()

          if (projectError) {
            setError("Project not found")
            return
          }
          
          // Fetch the profile of the project owner using the user_id
          const { data: ownerProfile, error: ownerProfileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", projectData.user_id)
          .single();
        
          if (ownerProfileError) {
              setError("Owner profile not found or there is an issue with the query")
              return
          } else if (ownerProfile.length === 0) {
              setError("No profile found for the given user ID.");
              return
          } else {
              // Process the profiles as needed
              console.log("Owner Profiles:", ownerProfile);
          }
          
          // Add the owner's profile to the projectData
          projectData.profiles = ownerProfile;

        // Check if user has access to this project
        if (!profileData?.is_admin && projectData.user_id !== user.id) {
          setError("You don't have permission to view this project")
          return
        }

        if (projectData) {
          setProject(projectData)
          setNewStatus(projectData.status)
        }

        // Fetch tasks
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("*")
          .eq("project_id", params.id)
          .order("created_at", { ascending: true })

        if (tasksData) {
          setTasks(tasksData)
        }

        // Fetch comments with admin status
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
      } catch (err) {
        setError("Failed to load project data")
        console.error("Error fetching project data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, router, supabase])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case "in_progress":
        return <Clock className="w-5 h-5 text-blue-600" />
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const addComment = async () => {
    if (!newComment.trim() || !project) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: comment, error } = await supabase
        .from("project_comments")
        .insert({
          project_id: project.id,
          profile_id: user.id,
          content: newComment.trim(),
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

      setComments(prevComments => [comment, ...prevComments])
      setNewComment("")
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateProjectStatus = async () => {
    if (!project || !newStatus) return

    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", project.id)

      if (error) throw error

      setProject(prevProject => prevProject ? { ...prevProject, status: newStatus } : null)
      setEditStatus(false)

      // Add system comment about status change
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: commentError } = await supabase
          .from("project_comments")
          .insert({
            project_id: project.id,
            profile_id: user.id,
            content: `Status do projeto alterado para: ${newStatus}`,
            type: "system"
          })

        if (commentError) throw commentError
      }
    } catch (error) {
      console.error("Error updating project status:", error)
    }
  }

  const deleteProject = async () => {
    if (!project) return

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
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p className="text-muted-foreground">{error || "Project not found"}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/projects")}
        >
          Back to Projects
        </Button>
      </div>
    )
  }

  const canEdit = isAdmin || project.user_id === currentUserId

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          <div className="flex items-center gap-2">
            {editStatus ? (
              <div className="flex items-center gap-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={updateProjectStatus}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditStatus(false)}>Cancelar</Button>
              </div>
            ) : (
              <>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${getStatusColor(project.status)}`}>
                  {getStatusIcon(project.status)}
                  {project.status === "completed" ? "Concluído" :
                   project.status === "in_progress" ? "Em Progresso" :
                   project.status === "cancelled" ? "Cancelado" :
                   "Pendente"}
                </span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditStatus(true)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
            <Badge variant="outline">{project.plan}</Badge>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Projeto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Exclusão</DialogTitle>
                </DialogHeader>
                <p>Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.</p>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={deleteProject}>
                    Excluir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6 col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="tasks">Tarefas</TabsTrigger>
              <TabsTrigger value="requirements">Requisitos</TabsTrigger>
              <TabsTrigger value="customizations">Personalizações</TabsTrigger>
              <TabsTrigger value="comments">Comentários</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Descrição</h3>
                <p className="text-muted-foreground">{project.description}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Produtos</h3>
                <div className="flex flex-wrap gap-2">
                  {project.products.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full"
                    >
                      <Package className="w-4 h-4" />
                      <span>{product}</span>
                    </div>
                  ))}
                </div>
              </div>

              {project.payment_details && (
                <div>
                  <h3 className="font-semibold mb-2">Detalhes do Pagamento</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span>Status: {project.payment_status}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ID do Pagamento: {project.payment_details.payment_id}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{task.title}</h4>
                    <Badge variant={task.priority === "high" ? "destructive" : "outline"}>
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{task.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <div className="flex items-center gap-4">
                      <span>{task.estimated_hours}h estimadas</span>
                      <span>Prazo: {format(new Date(task.deadline), "dd/MM/yyyy")}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="requirements">
              <div className="prose prose-sm max-w-none">
                {project.requirements}
              </div>
            </TabsContent>

            <TabsContent value="customizations">
              <div className="space-y-6">
                {Object.entries(project.customizations || {}).map(([product, details]) => (
                  <div key={product}>
                    <h3 className="font-semibold mb-2 capitalize">{product}</h3>
                    <div className="space-y-4">
                      {Object.entries(details as Record<string, any>).map(([key, value]) => (
                        <div key={key}>
                          <h4 className="text-sm font-medium capitalize">{key}</h4>
                          {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {value.map((item, index) => (
                                <Badge key={index} variant="secondary">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              {value}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="comments">
              <div className="space-y-6">
                {(isAdmin || project.user_id === currentUserId) && (
                  <div className="flex gap-4">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Adicione um comentário..."
                      className="flex-1 min-h-[100px] p-3 rounded-md border"
                    />
                    <Button
                      onClick={addComment}
                      disabled={isLoading || !newComment.trim()}
                    >
                      {isLoading ? "Enviando..." : "Comentar"}
                    </Button>
                  </div>
                )}

                <div className="space-y-4">
                  {comments.map((comment) => (
                    <Card key={comment.id} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {comment.type == "admin" ? (
                          <Shield className="w-5 h-5 text-primary" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className="font-medium">
                          {comment.profiles?.full_name || "Administrador"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      <p>{comment.content}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Informações</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{project.profiles?.full_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data de Início</p>
                  <p className="font-medium">
                    {format(new Date(project.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Prazo</p>
                  <p className="font-medium">
                    {format(new Date(project.deadline), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Atividade Recente</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm">
                  {comments.length} comentário(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm">
                  {tasks.filter(t => t.status === "completed").length} de {tasks.length} tarefas concluídas
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}