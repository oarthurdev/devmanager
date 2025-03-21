import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, validateRequestMethod, validateRequiredFields } from '@/lib/auth_utils';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Validate request method
    const methodError = validateRequestMethod(request, ['POST']);
    if (methodError) return methodError;

    // Require authentication
    const user = await requireAuth(request);
    if ('status' in user) return user;

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['plan', 'products', 'formData', 'customizations'];
    const fieldsError = validateRequiredFields(body, requiredFields);
    if (fieldsError) return fieldsError;

    const { plan, products, formData, customizations } = body;

    // Calculate deadline based on plan
    const deadlineDays = {
      'Básico': 30,
      'Profissional': 45,
      'Enterprise': 60
    };
    
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + deadlineDays[plan as keyof typeof deadlineDays]);

    const supabase = createClient();

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
    
    return NextResponse.json({ project_id: project.id });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}