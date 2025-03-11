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
  CreditCard
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
  user: {
    full_name: string
    email: string
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
  user_id: string
  content: string
  created_at: string
  user: {
    full_name: string
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
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editStatus, setEditStatus] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const supabase = createClient()
  const [commentList, setCommentList] = useState(comments);
  const [userCanComment, setUserCanComment] = useState(false)

  useEffect(() => {
    setCommentList(comments);
    
    const fetchData = async () => {
      if (!params.id) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtém informações do perfil do usuário logado
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, is_admin")
        .eq("id", user.id)
        .single()

      setIsAdmin(profileData?.is_admin || false)

      // Obtém detalhes do projeto
      const { data: projectData } = await supabase
      .from("projects")
      .select(`
        id, name, description, status, plan, user_id, products, deadline, created_at, requirements, customizations,
        profiles:profiles!id(user_id, full_name)
      `)
      .eq("id", params.id)
      .single();

      if (projectData) {
        setProject(projectData)

        // Verifica se o usuário tem permissão para comentar
        setUserCanComment(profileData?.is_admin || projectData.user_id === user.id)
      }

      // Obtém comentários do projeto
      const { data: commentsData, error } = await supabase
        .from("project_comments")
        .select(`
          id, project_id, profile_id, content, created_at,
          profiles!fk_profile(id, full_name)
        `)
        .eq("project_id", params.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Erro ao buscar comentários:", error)
      } else {
        setComments(commentsData || [])
      }
    }

    fetchData()
  }, [params.id, supabase, comments])

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

    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: comment, error } = await supabase
        .from("project_comments")
        .insert({
          project_id: project.id,
          profile_id: user.id,
          content: newComment.trim()
        })
        .select("*, profiles!fk_profile(full_name)")
        .single()

      if (error) throw error

      setComments([comment, ...comments])
      setNewComment("")
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!project) return null


  const updateProjectStatus = async () => {
    if (!project || !newStatus) return

    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", project.id)

      if (error) throw error

      setProject({ ...project, status: newStatus })
      setEditStatus(false)

      // Add system comment about status change
      const { error: commentError } = await supabase
        .from("project_comments")
        .insert({
          project_id: project.id,
          profile_id: (await supabase.auth.getUser()).data.user?.id,
          content: `Status do projeto alterado para: ${newStatus}`,
          type: "system"
        })

      if (commentError) throw commentError
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

  if (!project) return null

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
                {isAdmin && (
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
                {Object.entries(project.customizations).map(([product, details]) => (
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
              {userCanComment && (
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
                  {commentList.map((comment) => (
                    <Card key={comment.id} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">
                          {comment.profiles?.full_name 
                            ? comment.profiles.full_name 
                            : comment.profiles === undefined 
                              ? "Carregando..." 
                              : "Usuário desconhecido"}
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
                  <p className="font-medium">{project.profiles.full_name}</p>
                  <p className="text-sm text-muted-foreground">{project.profiles.email}</p>
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