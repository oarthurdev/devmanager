"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Bell, Mail, Lock, Moon } from "lucide-react"

interface Settings {
  notifications_email: boolean
  notifications_push: boolean
  dark_mode: boolean
}

interface Profile {
  full_name: string
  email: string
  phone: string
  document: string
  company_name?: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    notifications_email: true,
    notifications_push: true,
    dark_mode: false,
  })
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
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

      // Fetch settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (settingsData) {
        setSettings(settingsData)
      }
    }

    fetchData()
  }, [supabase])

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          company_name: profile.company_name,
        })
        .eq("id", (await supabase.auth.getUser()).data.user?.id)

      if (error) throw error

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao atualizar suas informações.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateSettings = async (key: keyof Settings, value: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          [key]: value,
        })

      if (error) throw error

      setSettings({ ...settings, [key]: value })
      
      toast({
        title: "Configurações atualizadas",
        description: "Suas preferências foram salvas com sucesso.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar configurações",
        description: "Ocorreu um erro ao salvar suas preferências.",
      })
    }
  }

  if (!profile) return null

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Configurações</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Perfil</h2>
          <form onSubmit={updateProfile} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>

            {profile.company_name !== undefined && (
              <div>
                <Label htmlFor="company_name">Empresa</Label>
                <Input
                  id="company_name"
                  value={profile.company_name || ""}
                  onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label htmlFor="document">Documento</Label>
              <Input
                id="document"
                value={profile.document}
                disabled
                className="bg-muted"
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </Card>

        {/* Notifications & Preferences */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Notificações</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Notificações por Email</p>
                    <p className="text-sm text-muted-foreground">
                      Receba atualizações sobre seus projetos por email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.notifications_email}
                  onCheckedChange={(checked) => updateSettings("notifications_email", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Notificações Push</p>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações em tempo real no navegador
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.notifications_push}
                  onCheckedChange={(checked) => updateSettings("notifications_push", checked)}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Preferências</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Modo Escuro</p>
                    <p className="text-sm text-muted-foreground">
                      Alterne entre tema claro e escuro
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.dark_mode}
                  onCheckedChange={(checked) => updateSettings("dark_mode", checked)}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Segurança</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Alterar Senha</p>
                    <p className="text-sm text-muted-foreground">
                      Atualize sua senha de acesso
                    </p>
                  </div>
                </div>
                <Button variant="outline">Alterar</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}