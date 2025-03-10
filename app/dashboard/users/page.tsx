"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { Search, Shield } from "lucide-react"

interface User {
  id: string
  full_name: string
  email: string
  account_type: string
  phone: string
  document: string
  company_name?: string
  is_admin: boolean
  created_at: string
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    const checkAdminAndFetchUsers = async () => {
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

      // Fetch users
      const { data: usersData } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          account_type,
          phone,
          document,
          company_name,
          is_admin,
          created_at
        `)
        .order("created_at", { ascending: false })

      if (usersData) {
        setUsers(usersData)
      }
    }

    checkAdminAndFetchUsers()
  }, [supabase, router])

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: !currentStatus })
        .eq("id", userId)

      if (error) throw error

      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_admin: !currentStatus }
          : user
      ))
    } catch (error) {
      console.error("Error updating admin status:", error)
    }
  }

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.document.includes(searchTerm)
  )

  if (!isAdmin) return null

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
      </div>

      <Card className="p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-left py-3 px-4">Documento</th>
                <th className="text-left py-3 px-4">Telefone</th>
                <th className="text-left py-3 px-4">Admin</th>
                <th className="text-left py-3 px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{user.full_name}</div>
                      {user.company_name && (
                        <div className="text-sm text-muted-foreground">
                          {user.company_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="capitalize">{user.account_type}</span>
                  </td>
                  <td className="py-3 px-4">{user.document}</td>
                  <td className="py-3 px-4">{user.phone}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.is_admin}
                        onCheckedChange={() => toggleAdminStatus(user.id, user.is_admin)}
                      />
                      {user.is_admin && <Shield className="h-4 w-4 text-primary" />}
                    </div>
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