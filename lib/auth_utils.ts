import { NextRequest, NextResponse } from 'next/server';
import { createClient } from './supabase/server';
import { cookies } from 'next/headers';

export const supabase = createClient();

export async function getAuthenticatedUser(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabaseClient = createClient();

    // Get session from cookie
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      return { user: null, error: 'Unauthorized' };
    }

    // Verify token from Authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const { data: { user: tokenUser }, error: tokenError } = await supabaseClient.auth.getUser(token);

      if (tokenError || !tokenUser || tokenUser.id !== session.user.id) {
        return { user: null, error: 'Invalid token' };
      }
    }

    // Get user profile with role information
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

export async function requireAuth(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  return user;
}

export async function requireAdmin(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  
  if (error || !user || !user.profile?.is_admin) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 403 }
    );
  }
  
  return user;
}

export function validateRequestMethod(request: NextRequest, allowedMethods: string[]) {
  if (!allowedMethods.includes(request.method)) {
    return NextResponse.json(
      { error: `Method ${request.method} not allowed` },
      { status: 405 }
    );
  }
  return null;
}

export function validateRequiredFields(body: any, requiredFields: string[]) {
  const missingFields = requiredFields.filter(field => !body[field]);
  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missingFields.join(', ')}` },
      { status: 400 }
    );
  }
  return null;
}