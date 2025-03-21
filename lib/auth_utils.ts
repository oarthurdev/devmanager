import { createClient } from './supabase/client';
import Cookies from 'js-cookie'; // Importando js-cookie

export const supabase = createClient();

export async function getAuthenticatedUser() {
  try {
    // Acessando o cookie diretamente no cliente
    const sessionCookie = Cookies.get('sb:session'); // Nome do cookie que o Supabase usa para armazenar a sessão

    if (!sessionCookie) {
      return { user: null, error: 'Unauthorized' };
    }

    const supabaseClient = createClient();
    const { data: { session }, error: sessionError } = await supabaseClient.auth.setSession({
      access_token: sessionCookie,
      refresh_token: ''
    });

    if (sessionError || !session) {
      return { user: null, error: 'Unauthorized' };
    }

    // Obtendo o perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*, roles(*)')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return { user: null, error: 'Profile not found' };
    }

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
