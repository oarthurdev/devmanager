import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth_utils';
import { sendTeamInvitation } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const supabase = createClient();

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, teamId, roleId } = body;

    console.log(body)
    // Check if user is admin or team leader
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get team and role details
    const [{ data: team }, { data: role }] = await Promise.all([
      supabase.from('teams').select('name').eq('id', teamId).single(),
      supabase.from('roles').select('name').eq('id', roleId).single()
    ]);

    if (!team || !role) {
      return NextResponse.json(
        { error: 'Team or role not found' },
        { status: 404 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    let userId = existingUser?.id;

    // If user doesn't exist, create a temporary invite record
    if (!userId) {
      userId = uuidv4();
      const { error: inviteError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          invited_to_team: teamId,
          invited_role: roleId
        }
      });

      if (inviteError) {
        throw inviteError;
      }
    }

    // Create team member record
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role_id: roleId,
        status: 'pending',
        invited_by: user.id
      });

    if (memberError) {
      throw memberError;
    }

    // Generate invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/convite?token=${userId}`;

    // Send invitation email
    await sendTeamInvitation({
      email,
      teamName: team.name,
      roleName: role.name,
      inviteLink
    });

    return NextResponse.json({
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}