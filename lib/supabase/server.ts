import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const createClient = () => {
  if (typeof window === 'undefined') {
    // No lado do servidor (Serverless), use a chave de service_role para funções administrativas
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use a chave de service_role no servidor
    );
  }

  // No lado do cliente, use a chave anon para o acesso público
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Chave de service_role usada no servidor para permissões administrativas
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; expires?: Date; maxAge?: number; domain?: string; secure?: boolean; httpOnly?: boolean; sameSite?: 'strict' | 'lax' | 'none'; }) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.error('Erro ao definir cookie:', error);
          }
        },
        remove(name: string, options: { path?: string; domain?: string; secure?: boolean; httpOnly?: boolean; sameSite?: 'strict' | 'lax' | 'none'; expires?: Date }) {
          try {
            cookieStore.set({ name, value: '', maxAge: 0, ...options });
          } catch (error) {
            console.error('Erro ao remover cookie:', error);
          }
        },
      },
    });
};
