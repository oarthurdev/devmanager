"use client"

import { Card } from "@/components/ui/card"
import { User, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"

interface ProjectInfoProps {
  project: any
  userRole?: { name: string; level: number }
}

export function ProjectInfo({ project, userRole }: ProjectInfoProps) {
  return (
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
  )
}