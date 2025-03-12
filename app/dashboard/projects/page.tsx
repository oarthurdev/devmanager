"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Plus, Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { format } from "date-fns"

interface Project {
  id: string
  name: string
  description: string
  status: string
  plan: string
  products: string[]
  deadline: string
  user_id: string
  payment_status: string
  payment_details: any
  created_at: string
  updated_at: string
  user?: {
    full_name: string,
    company_name: string,
    document: string,
    account_type: string,
    phone: string
  }
}

interface Profile {
  is_admin: boolean
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error("Erro ao buscar usuário:", userError);
          return;
        }

        // Buscar se o usuário é admin
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Erro ao buscar perfil do usuário:", profileError);
          return;
        }

        const isAdmin = profileData?.is_admin || false;
        setIsAdmin(isAdmin);

        // Construir a query de projetos
        let query = supabase
          .from("projects")
          .select("id, name, description, status, plan, user_id, products, deadline, created_at, updated_at, payment_status, payment_details, profiles(full_name, company_name, document, account_type, phone)");

        // Se não for admin, filtra os projetos apenas do usuário logado
        if (!isAdmin) {
          query = query.eq("user_id", user.id);
        }

        const { data: projectData, error: projectError } = await query;

        if (projectError) {
          console.error("Erro ao buscar projetos:", projectError);
          return;
        }

        setProjects(projectData || []);
      } catch (error) {
        console.error("Erro inesperado ao buscar dados:", error);
      }
    };

    fetchData();
  }, [supabase]);

  
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  } 

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {isAdmin ? "Todos os Projetos" : "Meus Projetos"}
        </h1>
        <Button asChild>
          <Link href="/planos">
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto
          </Link>
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isAdmin ? "Buscar por nome, descrição ou cliente..." : "Buscar projetos..."}
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
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={planFilter}
            onValueChange={setPlanFilter}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Básico">Básico</SelectItem>
              <SelectItem value="Profissional">Profissional</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Projeto</th>
                {isAdmin && <th className="text-left py-3 px-4">Cliente</th>}
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Plano</th>
                <th className="text-left py-3 px-4">Produtos</th>
                <th className="text-left py-3 px-4">Pagamento</th>
                <th className="text-left py-3 px-4">Prazo</th>
                <th className="text-left py-3 px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">{project.description}</div>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{project.user?.full_name}</div>
                      </div>
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(project.status)}
                      <span className={`px-2 py-1 rounded text-sm ${getStatusColor(project.status)}`}>
                        {project.status === "completed" ? "Concluído" :
                         project.status === "in_progress" ? "Em Progresso" :
                         project.status === "cancelled" ? "Cancelado" :
                         "Pendente"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">{project.plan}</Badge>
                  </td>
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
                    <span className={`px-2 py-1 rounded text-sm ${getPaymentStatusColor(project.payment_status)}`}>
                      {project.payment_status === "approved" ? "Aprovado" :
                       project.payment_status === "pending" ? "Pendente" :
                       project.payment_status === "rejected" ? "Rejeitado" :
                       "Não Iniciado"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">
                        {format(new Date(project.deadline), "dd/MM/yyyy")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(project.created_at), "dd/MM/yyyy")}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/projects/${project.id}`}>
                        Detalhes
                      </Link>
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