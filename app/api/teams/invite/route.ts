import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, validateRequestMethod, validateRequiredFields } from '@/lib/auth_utils';
import { sendTeamInvitation } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const supabase = createClient();

export async function POST(request: NextRequest) {
  try {
    // Validate request method
    const methodError = validateRequestMethod(request, ['POST']);
    if (methodError) return methodError;

    // Require admin authentication
    const user = await requireAdmin(request);
    if ('status' in user) return user;

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['email', 'teamId', 'roleId'];
    const fieldsError = validateRequiredFields(body, requiredFields);
    if (fieldsError) return fieldsError;

    const { email, teamId, roleId } = body;

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if role exists
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('name')
      .eq('id', roleId)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { error: 'Role not found' },
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

    // Create temporary user if doesn't exist
    if (!userId) {
      userId = uuidv4();
      const { error: inviteError } = await supabase.auth.admin.createUser({
        id: userId,
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

    // Generate invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/convite?token=${userId}`;

    // Send invitation email
    const emailSent = await sendTeamInvitation({
      email,
      teamName: team.name,
      roleName: role.name,
      inviteLink
    });

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      );
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