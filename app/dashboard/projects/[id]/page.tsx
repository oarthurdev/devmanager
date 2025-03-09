"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import {
  Clock,
  Calendar,
  User,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare
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
  const [project, setProject] = useState<Project | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return

      // Fetch project details
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.id)
        .single()

      if (projectData) {
        setProject(projectData)
      }

      // Fetch comments
      
      // Fetch comments
      const { data: commentsData } = await supabase
        .from("project_comments")
        .select(`
          id,
          project_id,  -- ADICIONADO project_id
          content,
          created_at,
          user_id,
          user:profiles(full_name)
        `)
        .eq("project_id", params.id)
        .order("created_at", { ascending: false });
      
      if (Array.isArray(commentsData)) {
        // Garantindo que user seja um objeto único e que project_id esteja presente
        const formattedComments = commentsData.map((comment) => ({
          id: comment.id,
          project_id: comment.project_id, // Garantindo que está presente
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id,
          user: Array.isArray(comment.user) ? comment.user[0] : comment.user,
        }));
        
        setComments(formattedComments);
      }

    }
    fetchData()
  }, [params.id, supabase])

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
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          user:profiles(full_name)
        `)
        .single()
      
      if (error) throw error;
      
      // Garantindo que user seja um objeto único
      const formattedComment = {
        ...comment,
        user: Array.isArray(comment.user) ? comment.user[0] : comment.user
      };
      
      setComments([formattedComment, ...comments]);
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!project) return null

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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${getStatusColor(project.status)}`}>
              {getStatusIcon(project.status)}
              {project.status === "completed" ? "Concluído" :
               project.status === "in_progress" ? "Em Progresso" :
               project.status === "cancelled" ? "Cancelado" :
               "Pendente"}
            </span>
            <Badge variant="outline">{project.plan}</Badge>
          </div>
        </div>
        <Button>Editar Projeto</Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6 col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
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

                <div className="space-y-4">
                  {comments.map((comment) => (
                    <Card key={comment.id} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">
                          {comment.user.full_name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
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
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data de Início</p>
                  <p className="font-medium">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Prazo</p>
                  <p className="font-medium">
                    {new Date(project.deadline).toLocaleDateString()}
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
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}