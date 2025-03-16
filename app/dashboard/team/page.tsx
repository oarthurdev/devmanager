"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import {
  Users,
  FolderKanban,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Shield
} from "lucide-react"

interface Project {
  id: string
  name: string
  description: string
  status: string
  plan: string
  deadline: string
  user: {
    full_name: string
  }
}

interface TeamMember {
  id: string
  user_id: string
  status: string
  joined_at: string | null
  profiles: {
    full_name: string
    email: string
    phone: string
  }
  roles: {
    id: string
    name: string
    level: number
  }
}

interface Team {
  id: string
  name: string
  description: string
  created_at: string
}

export default function TeamDashboardPage() {
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [userRole, setUserRole] = useState<{ name: string; level: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        // Get user's team membership and role
        const { data: teamMember } = await supabase
          .from("team_members")
          .select(`
            team_id,
            roles!fk_role (
              id,
              name,
              level
            )
          `)
          .eq("user_id", user.id)
          .eq("status", "active")
          .single()

        if (!teamMember) {
          router.push("/dashboard")
          return
        }

        setUserRole(teamMember.roles)

        // Get team details
        const { data: teamData } = await supabase
          .from("teams")
          .select("*")
          .eq("id", teamMember.team_id)
          .single()

        if (teamData) {
          setTeam(teamData)
        }

        // Get team projects
        const { data: projectsData } = await supabase
          .from("team_projects")
          .select(`
            projects (
              id,
              name,
              description,
              status,
              plan,
              deadline,
              user:user_id (
                full_name
              )
            )
          `)
          .eq("team_id", teamMember.team_id)

        if (projectsData) {
          setProjects(projectsData.map(p => ({
            ...p.projects,
            user: p.projects.user
          })))
        }

        // Get team members
        const { data: membersData } = await supabase
          .from("team_members")
          .select(`
            id,
            user_id,
            status,
            joined_at,
            profiles (
              full_name,
              email,
              phone
            ),
            roles!fk_role (
              id,
              name,
              level
            )
          `)
          .eq("team_id", teamMember.team_id)
          .order("roles(level)", { ascending: false })

        if (membersData) {
          setMembers(membersData)
        }
      } catch (error) {
        console.error("Error fetching team data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeamData()
  }, [router, supabase])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-600" />
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">Loading...</div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Sem Equipe</h2>
        <p className="text-muted-foreground">Você não está associado a nenhuma equipe.</p>
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
        <Badge className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          {userRole?.name}
        </Badge>
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
            <h3 className="font-semibold">Projetos Concluídos</h3>
          </div>
          <div className="text-3xl font-bold">
            {projects.filter(p => p.status === "completed").length}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Membro desde</h3>
          </div>
          <div className="text-xl font-medium">
            {format(new Date(team.created_at), "dd/MM/yyyy")}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects">Projetos</TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6">
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
                          {project.status === "completed" ? "Concluído" :
                           project.status === "in_progress" ? "Em Progresso" :
                           project.status === "cancelled" ? "Cancelado" :
                           "Pendente"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Cliente: {project.user?.full_name}
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

          <TabsContent value="members" className="space-y-6">
            <div className="space-y-4">
              {members.map((member) => (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{member.profiles.full_name}</h4>
                        <Badge variant="secondary">{member.roles.name}</Badge>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(member.status)}`}>
                          {getStatusIcon(member.status)}
                          {member.status === "active" ? "Ativo" :
                           member.status === "pending" ? "Pendente" :
                           "Inativo"}
                        </span>
                      </div>
                      {userRole && userRole.level >= member.roles.level && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {member.profiles.email}
                          </span>
                          <span className="flex items-center gap-1">
                            {member.profiles.phone}
                          </span>
                          {member.joined_at && (
                            <span className="flex items-center gap-1">
                              Entrou em {format(new Date(member.joined_at), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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