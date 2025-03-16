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
  Users,
  FolderKanban,
  UserPlus,
  Settings,
  Mail,
  Phone,
  Calendar,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react"

interface Team {
  id: string
  name: string
  description: string
  created_at: string
}

interface Member {
  id: string
  status: string
  joined_at: string | null
  user_id: string
  profiles: {
    full_name: string
    email: string
    phone: string
  }
  roles: {
    name: string
    level: number
  }
}

interface Project {
  id: string
  name: string
  status: string
  plan: string
  deadline: string
  profiles: {
    full_name: string
  }
}

export default function TeamDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        // Check if user is admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single()

        if (!profile?.is_admin) {
          router.push("/dashboard")
          return
        }

        setIsAdmin(true)

        // Fetch team details
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .select("*")
          .eq("id", params.id)
          .single()

        if (teamError) throw teamError
        setTeam(teamData)

        // Fetch team members with profile and role info
        const { data: membersData, error: membersError } = await supabase
          .from("team_members")
          .select(`
            id,
            status,
            joined_at,
            user_id,
            profiles:user_id (
              full_name,
              email,
              phone
            ),
            roles!fk_role (
              name,
              level
            )
          `)
          .eq("team_id", params.id)
          .order("roles(level)", { ascending: false })

        if (membersError) throw membersError
        setMembers(membersData)

        // Fetch team projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("team_projects")
          .select(`
            projects (
              id,
              name,
              status,
              plan,
              deadline,
              profiles (
                full_name
              )
            )
          `)
          .eq("team_id", params.id)

        if (projectsError) throw projectsError
        setProjects(projectsData.map(p => p.projects))
      } catch (err) {
        console.error("Error fetching team data:", err)
        setError("Failed to load team data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, router, supabase])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "inactive":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "inactive":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">Loading...</div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p className="text-muted-foreground">{error || "Team not found"}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/teams")}
        >
          Back to Teams
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">{team.name}</h1>
          <p className="text-muted-foreground">{team.description}</p>
        </div>
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Membros</h3>
          </div>
          <div className="text-3xl font-bold">{members.length}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderKanban className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Projetos</h3>
          </div>
          <div className="text-3xl font-bold">{projects.length}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Membros Ativos</h3>
          </div>
          <div className="text-3xl font-bold">
            {members.filter(m => m.status === "active").length}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Criada em</h3>
          </div>
          <div className="text-xl font-medium">
            {format(new Date(team.created_at), "dd/MM/yyyy")}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="projects">Projetos</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Membros da Equipe</h3>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Membro
              </Button>
            </div>

            <div className="space-y-4">
              {members.map((member) => (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{member.profiles?.full_name}</h4>
                        <Badge variant="secondary">{member.roles.name}</Badge>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(member.status)}`}>
                          {getStatusIcon(member.status)}
                          {member.status === "active" ? "Ativo" :
                           member.status === "pending" ? "Pendente" :
                           "Inativo"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {member.profiles?.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {member.profiles?.phone}
                        </span>
                        {member.joined_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Entrou em {format(new Date(member.joined_at), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Projetos da Equipe</h3>
            </div>

            <div className="space-y-4">
              {projects.map((project) => (
                <Card key={project.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{project.name}</h4>
                        <Badge>{project.plan}</Badge>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(project.status)}`}>
                          {getStatusIcon(project.status)}
                          {project.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Cliente: {project.profiles.full_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Prazo: {format(new Date(project.deadline), "dd/MM/yyyy")}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}