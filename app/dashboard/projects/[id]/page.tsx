"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import Dropzone, { FileWithPath } from "react-dropzone"
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
  Shield,
  Info,
  Upload,
  FileText,
  X
} from "lucide-react"
import { createNotification } from "@/lib/notifications"
import { VisuallyHidden } from "@reach/visually-hidden"

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
  type: "user" | "admin" | "system"
  profiles: {
    full_name: string
    is_admin: boolean
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
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [token, setToken] = useState("")
  const [signedUrl, setSignedUrl] = useState("")
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [showCarousel, setShowCarousel] = useState(false)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (session) {
          console.log(session);
          // Aqui você pode setar o token no estado, caso necessário
          setToken(session.data.session.access_token);
        } else {
          console.log("Sessão não encontrada.");
        }
      } catch (uplerror) {
        console.error("Erro ao obter sessão:", error);
      }
    };

    fetchSession();

    // if (token.length == 0) {
    //   setError("Você precisa estar logado para acessar o projeto.");
    //   return;
    // }

    const fetchAttachments = async () => {
      try {
        const { data, error } = await supabase.storage.from("attachments").list(`${params.id}`);
        
        if (error) {
          console.error("Erro ao listar arquivos:", error);
          return;
        }
    
        // Para cada arquivo, cria uma URL assinada
        const filesWithUrls = await Promise.all(
          data.map(async (file) => {
            const filePath = `${params.id}/${file.name}`;
            const { data: signedUrlData, error: signedUrlError } = await supabase
              .storage
              .from("attachments")
              .createSignedUrl(filePath, 3600); // 1 hora de expiração para a URL
    
            if (signedUrlError) {
              console.error("Erro ao gerar URL assinada:", signedUrlError);
              return { ...file, url: "" }; // Caso haja erro, não retornar a URL
            }
  
            // Retorna o arquivo com a URL assinada
            return { ...file, url: signedUrlData?.signedUrl };
          })
        );

        setAttachments(filesWithUrls);
      } catch (error) {
        console.error("Erro ao obter anexos:", error);
      }
    };
    
  
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
    fetchAttachments()
  }, [token, params.id, router, supabase ])

  const cleanUrl = (url: string | undefined) => {
    if (url) {
      return url.replace("/upload", "")
    }
    return url
  }

  const handleUpload = async (files: FileWithPath[]) => {
    if (!files.length) return;
    setUploading(true);

    for (const file of files) {
      const uniqueFileName = `${Date.now()}-${file.name}`
      const filePath = `${params.id}/${uniqueFileName}`

      const { data: signedUrlData , error} = await supabase.storage.from("attachments").createSignedUploadUrl(filePath)

      if (error) {
        setError("Failed to upload file")
        return;
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
      .from("attachments")
      .uploadToSignedUrl(
        filePath,
        signedUrlData.token,
        file
      );
    
      if (uploadError) {
        setError("Failed to upload file")
        return;
      }

      const cleanSignedUrl = cleanUrl(signedUrlData?.signedUrl)

      setAttachments((prev) => [...prev, { name: uniqueFileName, path: filePath, url: cleanSignedUrl }])
    }

    setUploading(false)
  }

  const deleteFile = async (filePath) => {
    await supabase.storage.from("attachments").remove([filePath])
    setAttachments((prev) => prev.filter((file) => file.path !== filePath))
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

  const getCommentIcon = (type: string) => {
    switch (type) {
      case "admin":
        return <Shield className="w-5 h-5 text-primary" />
      case "system":
        return <Info className="w-5 h-5 text-blue-500" />
      default:
        return <User className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getCommentAuthor = (comment: Comment) => {
    if (comment.type === "system") {
      return "Sistema"
    }
    return comment.profiles?.full_name || (comment.type === "admin" ? "Administrador" : "Usuário")
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

      // Create notification for project owner if comment is from admin
      if (isAdmin && project.user_id !== user.id) {
        await createNotification({
          userId: project.user_id,
          type: 'admin_comment',
          title: 'Novo Comentário do Administrador',
          message: `Um administrador comentou em seu projeto: "${newComment.trim().substring(0, 100)}${newComment.length > 100 ? '...' : ''}"`,
          projectId: project.id,
          metadata: {
            comment_id: comment.id,
            admin_id: user.id
          }
        })
      }
      // Create notification for admin if comment is from user
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
              message: `${project.profiles.full_name} comentou no projeto "${project.name}": "${newComment.trim().substring(0, 100)}${newComment.length > 100 ? '...' : ''}"`,
              projectId: project.id,
              metadata: {
                comment_id: comment.id,
                user_id: user.id
              }
            })
          }
        }
      }

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", project.id)

      if (error) throw error

      setProject(prevProject => prevProject ? { ...prevProject, status: newStatus } : null)
      setEditStatus(false)

      // Add system comment about status change
      const { error: commentError } = await supabase
        .from("project_comments")
        .insert({
          project_id: project.id,
          profile_id: user.id,
          content: `Status do projeto alterado para: ${newStatus}`,
          type: "system"
        })

      if (commentError) throw commentError

      // Create notification about status change
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
          updated_by: user.id,
          is_admin: isAdmin
        }
      })

      // If project is completed, notify admins
      if (newStatus === 'completed') {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_admin', true)

        if (admins) {
          for (const admin of admins) {
            await createNotification({
              userId: admin.id,
              type: 'project_completed',
              title: 'Projeto Concluído',
              message: `O projeto "${project.name}" foi marcado como concluído.`,
              projectId: project.id,
              metadata: {
                user_id: project.user_id,
                user_name: project.profiles.full_name,
                completed_by: user.id
              }
            })
          }
        }
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
              <TabsTrigger value="attachments">Anexos</TabsTrigger>
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
                        {getCommentIcon(comment.type)}
                        <span className="font-medium">
                          {getCommentAuthor(comment)}
                          {comment.type === "admin" && (
                            <span className="ml-2 text-sm text-primary">(Admin)</span>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      <p className={comment.type === "system" ? "text-sm text-muted-foreground italic" : ""}>
                        {comment.content}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attachments">
              <div className="space-y-4">
                <Dropzone onDrop={handleUpload} accept={{ "image/*": [".png", ".jpg", ".jpeg"], "application/pdf": [".pdf"] }}>
                  {({ getRootProps, getInputProps }) => (
                    <div {...getRootProps()} className="border-dashed border-2 p-6 rounded-lg cursor-pointer text-center">
                      <input {...getInputProps()} />
                      <Upload className="w-6 h-6 mx-auto text-gray-500" />
                      <p className="text-gray-600 mt-2">Arraste um arquivo ou clique para selecionar</p>
                    </div>
                  )}
                </Dropzone>
                {uploading && <p>Enviando...</p>}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {attachments.map((file, index) => (
                    <div key={file.name} className="relative group border rounded-md p-2">
                      {file.name.endsWith(".pdf") ? (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                          <FileText className="w-4 h-4" /> {file.name}
                        </a>
                      ) : file.name.match(/.(jpg|jpeg|png)$/) ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-32 object-cover rounded cursor-pointer"
                          onClick={() => {
                            setCarouselIndex(index)
                            setShowCarousel(true)
                          }}
                        />
                      ) : (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600">
                          <FileText className="w-4 h-4" /> {file.name}
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100"
                        onClick={() => deleteFile(file.path)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {showCarousel && (
                  <Dialog open={showCarousel} onOpenChange={setShowCarousel}>
                    <DialogContent>
                    <DialogDescription>Imagem</DialogDescription>
                    <VisuallyHidden>
                      < DialogTitle>Visualizar Imagem</DialogTitle>
                    </VisuallyHidden>
                      <img src={attachments[carouselIndex]?.url} alt="Imagem" className="w-full" />
                    </DialogContent>
                  </Dialog>
                )}
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