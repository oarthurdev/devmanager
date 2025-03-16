"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { Users, Search, Plus, UserPlus, Settings } from "lucide-react"
import { format } from "date-fns"

interface Team {
  id: string
  name: string
  description: string
  created_at: string
  _count?: {
    members: number
    projects: number
  }
}

interface Role {
  id: string
  name: string
  description: string
  level: number
}

export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showNewTeamDialog, setShowNewTeamDialog] = useState(false)
  const [showInviteMemberDialog, setShowInviteMemberDialog] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [newTeamData, setNewTeamData] = useState({
    name: "",
    description: ""
  })
  const [inviteData, setInviteData] = useState({
    email: "",
    roleId: "",
    teamId: ""
  })
  const supabase = createClient()

  useEffect(() => {
    const checkAdminAndFetchTeams = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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

      // Fetch teams with member and project counts
      const { data: teamsData } = await supabase
        .from("teams")
        .select(`
          *,
          members:team_members(count),
          projects:team_projects(count)
        `)
        .order("created_at", { ascending: false })

      if (teamsData) {
        const teamsWithCounts = teamsData.map(team => ({
          ...team,
          _count: {
            members: team.members[0].count,
            projects: team.projects[0].count
          }
        }))
        setTeams(teamsWithCounts)
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from("roles")
        .select("*")
        .order("level", { ascending: false })

      if (rolesData) {
        setRoles(rolesData)
      }
    }

    checkAdminAndFetchTeams()
  }, [supabase, router])

  const createTeam = async () => {
    try {
      const { data: team, error } = await supabase
        .from("teams")
        .insert(newTeamData)
        .select()
        .single()

      if (error) throw error

      setTeams([{ ...team, _count: { members: 0, projects: 0 } }, ...teams])
      setShowNewTeamDialog(false)
      setNewTeamData({ name: "", description: "" })
    } catch (error) {
      console.error("Error creating team:", error)
    }
  }

  const inviteMember = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("team_members")
        .insert({
          team_id: inviteData.teamId,
          role_id: inviteData.roleId,
          invited_by: user.id,
          status: "pending"
        })

      if (error) throw error

      // TODO: Send email invitation
      
      setShowInviteMemberDialog(false)
      setInviteData({ email: "", roleId: "", teamId: "" })
    } catch (error) {
      console.error("Error inviting member:", error)
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAdmin) return null

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Equipes</h1>
        <Button onClick={() => setShowNewTeamDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Equipe
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar equipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{team.name}</h3>
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{team._count?.members || 0} membros</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Criado em {format(new Date(team.created_at), "dd/MM/yyyy")}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedTeam(team)
                      setInviteData({ ...inviteData, teamId: team.id })
                      setShowInviteMemberDialog(true)
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Convidar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* New Team Dialog */}
      <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Equipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Equipe</Label>
              <Input
                id="name"
                value={newTeamData.name}
                onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newTeamData.description}
                onChange={(e) => setNewTeamData({ ...newTeamData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTeamDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createTeam}>Criar Equipe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteMemberDialog} onOpenChange={setShowInviteMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="role">Cargo</Label>
              <Select
                value={inviteData.roleId}
                onValueChange={(value) => setInviteData({ ...inviteData, roleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cargo" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteMemberDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={inviteMember}>Enviar Convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}