import { createClient } from './supabase/server';
import { cookies } from 'next/headers';

export const supabase = createClient();

export async function getAuthenticatedUser() {
  try {
    const cookieStore = cookies();
    const supabaseClient = createClient();

    // Pega a sessão do cookie
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      return { user: null, error: 'Unauthorized' };
    }

    // Obtém o perfil do usuário com informações de roles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*, roles(*)')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return { user: null, error: 'Profile not found' };
    }

    // Retorna o usuário com seu perfil
    return { 
      user: {
        ...session.user,
        profile
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Auth error:', error);
    return { user: null, error: 'Authentication error' };
  }
}

// Função para verificar se o usuário está autenticado
export async function requireAuth() {
  const { user, error } = await getAuthenticatedUser();
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

// Função para verificar se o usuário tem permissão de admin
export async function requireAdmin() {
  const { user, error } = await getAuthenticatedUser();
  
  if (error || !user || !user.profile?.is_admin) {
    throw new Error('Unauthorized - Admin access required');
  }
  
  return user;
}

// Função para validar o método da requisição
export function validateRequestMethod(allowedMethods: string[], method: string) {
  if (!allowedMethods.includes(method)) {
    throw new Error(`Method ${method} not allowed`);
  }
}

// Função para validar os campos obrigatórios
export function validateRequiredFields(body: any, requiredFields: string[]) {
  const missingFields = requiredFields.filter(field => !body[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}
