"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { User } from "lucide-react"

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
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [userCanComment, setUserCanComment] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
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
        .select("id, name, description, status, plan, user_id, products, deadline, created_at, requirements, customizations")
        .eq("id", params.id)
        .single()

      if (projectData) {
        setProject(projectData)

        // Verifica se o usuário tem permissão para comentar
        setUserCanComment(profileData?.is_admin || projectData.user_id === user.id)
      }

      // Obtém comentários do projeto
      const { data: commentsData, error } = await supabase
        .from("project_comments")
        .select(`
          id, project_id, user_id, content, created_at,
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
  }, [params.id])

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <Badge variant="outline">{project.status}</Badge>
      </div>

      {/* Área de Comentários */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Comentários</h3>

        {userCanComment && (
          <div className="flex gap-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Adicione um comentário..."
              className="flex-1 min-h-[100px] p-3 rounded-md border"
            />
            <Button onClick={addComment} disabled={isLoading || !newComment.trim()}>
              {isLoading ? "Enviando..." : "Comentar"}
            </Button>
          </div>
        )}

        <div className="space-y-4 mt-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <Card key={comment.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">
                    {comment.user?.full_name || "Usuário desconhecido"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                <p>{comment.content}</p>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground">Nenhum comentário ainda.</p>
          )}
        </div>
      </Card>
    </div>
  )
}