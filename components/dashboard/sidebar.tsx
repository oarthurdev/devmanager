"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  User,
  Settings,
  LogOut,
  Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"

const adminRoutes = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard
  },
  {
    name: "Projetos",
    href: "/dashboard/projects",
    icon: FolderKanban
  },
  {
    name: "Usuários",
    href: "/dashboard/users",
    icon: User
  },
  {
    name: "Equipes",
    href: "/dashboard/teams",
    icon: Users
  },
  {
    name: "Configurações",
    href: "/dashboard/settings",
    icon: Settings
  }
]

const userRoutes = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard
  },
  {
    name: "Meus Projetos",
    href: "/dashboard/projects",
    icon: FolderKanban
  },
  {
    name: "Configurações",
    href: "/dashboard/settings",
    icon: Settings
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()
  
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        
        setIsAdmin(data?.is_admin || false)
      }
    }
    
    checkAdmin()
  }, [supabase])

  const routes = isAdmin ? adminRoutes : userRoutes
  
  return (
    <div className="w-64 bg-card border-r flex flex-col">
      <div className="p-6">
        <Link href="/" className="flex items-center">
          <span className="font-bold text-lg">oarthur.dev</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {routes.map((route) => {
          const Icon = route.icon
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                pathname === route.href
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-primary/5"
              )}
            >
              <Icon className="w-5 h-5" />
              {route.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut()}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  )
}