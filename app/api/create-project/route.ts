import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth_utils';
import { createNotification } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const supabase = createClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, products, formData, customizations } = body;

    // Get the authenticated user
    const { user, error } = await getAuthenticatedUser(request);

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Calculate deadline based on plan
    const deadlineDays = {
      'Básico': 30,
      'Profissional': 45,
      'Enterprise': 60
    };
    
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + deadlineDays[plan as keyof typeof deadlineDays]);

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: `${products[0]} - ${plan}`,
        description: `Projeto ${plan} incluindo: ${products.join(', ')}`,
        status: 'pending',
        plan,
        products,
        payment_status: 'pending',
        requirements: formData.requirements,
        customizations,
        deadline: deadline.toISOString(),
      })
      .select()
      .single();

    if (projectError) {
      throw projectError;
    }

    // Notify user about project creation
    await createNotification({
      userId: user.id,
      type: 'project_created',
      title: 'Projeto Criado',
      message: `Seu projeto "${project.name}" foi criado com sucesso. Aguardando confirmação do pagamento.`,
      projectId: project.id,
      metadata: {
        plan,
        products,
        deadline: deadline.toISOString()
      }
    });

    // Notify admins about new project
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true);

    if (admins) {
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: 'new_project',
          title: 'Novo Projeto',
          message: `Um novo projeto "${project.name}" foi criado e aguarda pagamento.`,
          projectId: project.id,
          metadata: {
            plan,
            products,
            user_id: user.id
          }
        });
      }
    }
    
    return NextResponse.json({project_id: project.id});
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}