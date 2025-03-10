"use client"

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useAuth() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message === "Email not confirmed") {
          toast({
            variant: "destructive",
            title: "Email não confirmado",
            description: "Por favor, confirme seu email antes de fazer login.",
          })
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao fazer login",
            description: "Email ou senha incorretos.",
          })
        }
        throw error
      }

      router.push('/dashboard')
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta.",
      })
    } catch (error: any) {
      throw error
    }
  }

  const signUp = async (
    email: string,
    password: string,
    profile: {
      account_type: 'pf' | 'pj'
      full_name: string
      phone: string
      document: string
      company_name?: string
    }
  ) => {
    try {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: profile.full_name,
          }
        }
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Inserir o registro na tabela profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id, // Usando o ID do usuário recém-criado
              account_type: profile.account_type,
              full_name: profile.full_name,
              phone: profile.phone,
              document: profile.document,
              company_name: profile.company_name || null, // Usando null se não for PJ
              is_admin: false, // Definindo is_admin como false por padrão
              created_at: new Date(),
              updated_at: new Date(),
            },
          ]);

        if (profileError) throw profileError
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para confirmar sua conta.",
      })
      router.push('/auth/login')
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error.message,
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      router.push('/')
      toast({
        title: "Logout realizado com sucesso",
        description: "Até logo!",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer logout",
        description: error.message,
      })
      throw error
    }
  }

  return {
    signIn,
    signUp,
    signOut,
  }
}