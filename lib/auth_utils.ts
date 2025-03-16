import { NextRequest } from 'next/server';
import { createClient } from './supabase/server';

export const supabase = createClient();

export async function getAuthenticatedUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return { user: null, error: 'Auth session missing!' };
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null, error: 'Unauthorized' };
    }

    return { user, error: null };
  } catch (error) {
    return { user: null, error: 'Error retrieving user authentication' };
  }
}
