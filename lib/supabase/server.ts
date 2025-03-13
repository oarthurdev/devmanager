import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const createClient = () => {
  if (typeof window === 'undefined') {
    // If in a serverless function, create a client without cookies
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use the public anon key for client-side
    );
  }

  // Se estiver rodando no SSR, usa cookies
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
