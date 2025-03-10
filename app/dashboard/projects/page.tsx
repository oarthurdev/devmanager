"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Plus, Search, Filter } from "lucide-react"

interface Project {
  id: string
  name: string
  description: string
  status: string
  plan: string
  products: string[]
  deadline: string
  user_id: string
}

interface Profile {
  is_admin: boolean
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user is admin
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single()

      setIsAdmin(profileData?.is_admin || false)

      // Fetch projects
      let query = supabase
        .from("projects")
        .select("*")

      if (!profileData?.is_admin) {
        query = query.eq("user_id", user.id)
      }

      const { data: projectsData } = await query

      if (projectsData) {
        setProjects(projectsData)
      }
    }

    fetchData()
  }, [supabase])

  const filteredProjects = projects
    .filter(project => 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(project => 
      statusFilter === "all" ? true : project.status === statusFilter
    )

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {isAdmin ? "Todos os Projetos" : "Meus Projetos"}
        </h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Plano</th>
                <th className="text-left py-3 px-4">Produtos</th>
                <th className="text-left py-3 px-4">Prazo</th>
                <th className="text-left py-3 px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-b">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">{project.description}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 rounded text-sm ${
                      project.status === "completed" ? "bg-green-100 text-green-800" :
                      project.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                      project.status === "cancelled" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {project.status === "completed" ? "Concluído" :
                       project.status === "in_progress" ? "Em Progresso" :
                       project.status === "cancelled" ? "Cancelado" :
                       "Pendente"}
                    </span>
                  </td>
                  <td className="py-3 px-4">{project.plan}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {project.products.map((product, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/10 rounded-full text-xs"
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {new Date(project.deadline).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}