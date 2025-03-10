"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Project {
  id: string
  name: string
  status: string
  plan: string
  deadline: string
}

interface Profile {
  full_name: string
  account_type: string
  is_admin: boolean
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Fetch projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .eq(profileData?.is_admin ? "status" : "user_id", profileData?.is_admin ? "in_progress" : user.id)

      if (projectsData) {
        setProjects(projectsData)
      }
    }

    fetchData()
  }, [supabase])

  const projectStats = [
    { status: "Pendente", count: projects.filter(p => p.status === "pending").length },
    { status: "Em Progresso", count: projects.filter(p => p.status === "in_progress").length },
    { status: "Concluído", count: projects.filter(p => p.status === "completed").length }
  ]

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          Bem-vindo, {profile?.full_name}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Total de Projetos</h3>
          <p className="text-3xl font-bold">{projects.length}</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Em Andamento</h3>
          <p className="text-3xl font-bold text-blue-500">
            {projects.filter(p => p.status === "in_progress").length}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Concluídos</h3>
          <p className="text-3xl font-bold text-green-500">
            {projects.filter(p => p.status === "completed").length}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Status dos Projetos</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Projetos Recentes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Plano</th>
                <th className="text-left py-3 px-4">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, 5).map((project) => (
                <tr key={project.id} className="border-b">
                  <td className="py-3 px-4">{project.name}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 rounded text-sm ${
                      project.status === "completed" ? "bg-green-100 text-green-800" :
                      project.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {project.status === "completed" ? "Concluído" :
                       project.status === "in_progress" ? "Em Progresso" :
                       "Pendente"}
                    </span>
                  </td>
                  <td className="py-3 px-4">{project.plan}</td>
                  <td className="py-3 px-4">
                    {new Date(project.deadline).toLocaleDateString()}
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