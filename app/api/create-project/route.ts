import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { plan, products, formData, customizations } = body;

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    console.log({
      user_id: user.id,
      name: `${products[0]} - ${plan}`,
      description: `Projeto ${plan} incluindo: ${products.join(', ')}`,
      status: 'pending',
      plan,
      products,
      requirements: formData.requirements,
      customizations,
      deadline: deadline.toISOString(),
    });
    
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
        requirements: formData.requirements,
        customizations,
        deadline: deadline.toISOString(),
      })
      .select()
      .single();

    console.log(project)
    
    if (projectError) {
      throw projectError;
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