"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Edit, Trash2 } from "lucide-react"

interface ProjectHeaderProps {
  project: any
  canEdit: boolean
  isAdmin: boolean
  userRole?: { name: string; level: number }
  onUpdateStatus: (status: string) => Promise<void>
  onDelete: () => Promise<void>
}

export function ProjectHeader({
  project,
  canEdit,
  isAdmin,
  userRole,
  onUpdateStatus,
  onDelete
}: ProjectHeaderProps) {
  const [editStatus, setEditStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(project.status)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅"
      case "in_progress":
        return "⏳"
      case "cancelled":
        return "❌"
      default:
        return "⚠️"
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

  const handleStatusUpdate = async () => {
    await onUpdateStatus(newStatus)
    setEditStatus(false)
  }

  const canChangeStatus = userRole && userRole.level >= 3 // Assuming level 3+ can change status

  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
        <div className="flex items-center gap-2">
          {editStatus && canChangeStatus ? (
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
              <Button size="sm" onClick={handleStatusUpdate}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditStatus(false)}>
                Cancelar
              </Button>
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
              {canChangeStatus && (
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
                <Button variant="destructive" onClick={onDelete}>
                  Excluir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}