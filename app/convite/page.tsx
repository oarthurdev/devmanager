"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle2, XCircle } from "lucide-react"

export default function InvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const supabase = createClient()

  useEffect(() => {
    const acceptInvite = async () => {
      try {
        const token = searchParams.get("token")
        if (!token) {
          setStatus("error")
          setMessage("Convite inválido")
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push(`/auth/login?redirect=/convite?token=${token}`)
          return
        }

        // Update team member status
        const { error: updateError } = await supabase
          .from("team_members")
          .update({
            status: "active",
            joined_at: new Date().toISOString()
          })
          .eq("user_id", token)

        if (updateError) throw updateError

        setStatus("success")
        setMessage("Convite aceito com sucesso!")

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      } catch (error) {
        console.error("Error accepting invite:", error)
        setStatus("error")
        setMessage("Erro ao aceitar convite")
      }
    }

    acceptInvite()
  }, [searchParams, router, supabase])

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary py-16">
      <div className="container max-w-md mx-auto px-4">
        <Card className="p-6 text-center">
          {status === "loading" ? (
            <div className="animate-pulse">Processando convite...</div>
          ) : status === "success" ? (
            <div className="space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <h1 className="text-2xl font-bold">Bem-vindo à equipe!</h1>
              <p className="text-muted-foreground">{message}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h1 className="text-2xl font-bold">Erro</h1>
              <p className="text-muted-foreground">{message}</p>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
              >
                Voltar para Home
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}