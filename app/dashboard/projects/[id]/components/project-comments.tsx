"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Shield, Info, User } from "lucide-react"

interface ProjectCommentsProps {
  comments: any[]
  canComment: boolean
  onAddComment: (content: string) => Promise<void>
}

export function ProjectComments({
  comments,
  canComment,
  onAddComment
}: ProjectCommentsProps) {
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)

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

  const getCommentAuthor = (comment: any) => {
    if (comment.type === "system") {
      return "Sistema"
    }
    return comment.profiles?.full_name || (comment.type === "admin" ? "Administrador" : "Usuário")
  }

  const handleSubmit = async () => {
    if (!newComment.trim()) return
    setIsLoading(true)
    try {
      await onAddComment(newComment)
      setNewComment("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {canComment && (
        <div className="flex gap-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicione um comentário..."
            className="flex-1 min-h-[100px] p-3 rounded-md border"
          />
          <Button
            onClick={handleSubmit}
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
  )
}