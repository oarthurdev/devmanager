import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const supabase = createClient();

// Configuração do cliente do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
});

const payment = new Payment(client);

// Função para registrar logs no banco de dados
async function logToDatabase(level, message, metadata = {}) {
  const { error } = await supabase
    .from('logs')
    .insert([{ level, message, metadata }]);

  if (error) {
    console.error('Erro ao salvar log no banco:', error);
  }
}

// Habilitar CORS para o webhook
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();


    if (body.action == 'payment.updated') {
      await logToDatabase('info', 'Webhook válido recebido', { type: body.type, paymentId: body.data.id });

      processPayment(body.data.id).catch(async (error) => {
        await logToDatabase('error', 'Erro no processamento assíncrono do pagamento', { error: error.message });
      });
    }
    await logToDatabase('info', 'Webhook processado com sucesso');
    
    return NextResponse.json({ status: 'processing' });
  } catch (error) {
    await logToDatabase('error', 'Erro no webhook', { error: error.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processPayment(paymentId) {
  try {
    const paymentData = await payment.get({ id: paymentId });

    await logToDatabase('info', 'Pagamento processado', { paymentId: paymentData.id, status: paymentData.status, metadata: paymentData.metadata });

    if (!paymentData || !paymentData.metadata?.project_id) {
      await logToDatabase('error', 'Dados do pagamento incompletos ou inválidos');
      throw new Error('Dados do pagamento incompletos ou inválidos');
    }

    console.log(paymentData);

    const projectStatus = getProjectStatus(paymentData.status);
    const notificationInfo = getNotificationInfo(paymentData.status);

    await logToDatabase('info', 'Atualizando status do projeto', { projectStatus });

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .update({
        status: projectStatus,
        updated_at: new Date().toISOString(),
        payment_id: paymentId,
        payment_status: paymentData.status,
        payment_details: {
          status: paymentData.status,
          status_detail: paymentData.status_detail,
          payment_method: paymentData.payment_method_id,
          payment_type: paymentData.payment_type_id,
          transaction_amount: paymentData.transaction_amount,
          transaction_date: paymentData.date_created,
        }
      })
      .eq('id', paymentData.metadata.project_id)
      .select('*, profiles(id, full_name)')
      .single();

    if (projectError) throw projectError;

    if (project) {
      // Notify project owner
      await createNotification({
        userId: project.user_id,
        type: `payment_${paymentData.status}`,
        title: notificationInfo.title,
        message: notificationInfo.message,
        projectId: project.id,
        metadata: {
          payment_id: paymentId,
          payment_status: paymentData.status,
          payment_amount: paymentData.transaction_amount
        }
      });

      // Notify admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_admin', true);

      if (admins) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: `payment_${paymentData.status}`,
            title: `Pagamento ${notificationInfo.title.toLowerCase()}`,
            message: `O pagamento do projeto "${project.name}" foi ${notificationInfo.title.toLowerCase()}.`,
            projectId: project.id,
            metadata: {
              payment_id: paymentId,
              payment_status: paymentData.status,
              payment_amount: paymentData.transaction_amount,
              user_id: project.user_id,
              user_name: project.profiles.full_name
            }
          });
        }
      }

      // If payment was approved, create initial tasks
      if (paymentData.status === 'approved') {
        await createInitialTasks(supabase, project);
      }
    }
  } catch (error) {
    await logToDatabase('error', 'Erro no processamento do pagamento', { error: error.message });
    throw error;
  }
}

function getProjectStatus(paymentStatus) {
  const statusMap = {
    approved: 'in_progress',
    pending: 'pending',
    in_process: 'pending',
    rejected: 'cancelled',
    cancelled: 'cancelled',
    refunded: 'cancelled',
    charged_back: 'cancelled'
  };
  return statusMap[paymentStatus] || 'pending';
}

function getNotificationInfo(paymentStatus) {
  const notifications = {
    approved: { type: 'payment_success', title: 'Pagamento Aprovado', message: 'Seu pagamento foi aprovado.' },
    pending: { type: 'payment_pending', title: 'Pagamento Pendente', message: 'Aguardando confirmação do pagamento.' },
    in_process: { type: 'payment_pending', title: 'Pagamento em Processamento', message: 'Seu pagamento está sendo processado.' },
    rejected: { type: 'payment_failed', title: 'Pagamento Rejeitado', message: 'Houve um problema com seu pagamento.' },
    cancelled: { type: 'payment_failed', title: 'Pagamento Cancelado', message: 'Seu pagamento foi cancelado.' },
    refunded: { type: 'payment_failed', title: 'Pagamento Reembolsado', message: 'Seu pagamento foi reembolsado.' },
    charged_back: { type: 'payment_failed', title: 'Pagamento Contestado', message: 'Seu pagamento foi contestado.' }
  };
  return notifications[paymentStatus];
}

async function createInitialTasks(supabase: any, project: any) {
  const tasks = [
    {
      title: 'Análise de Requisitos',
      description: 'Levantamento e documentação detalhada dos requisitos do projeto',
      status: 'pending',
      project_id: project.id,
      priority: 'high',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
      estimated_hours: 20
    },
    {
      title: 'Design e Prototipagem',
      description: 'Criação dos layouts e protótipos interativos da interface',
      status: 'pending',
      project_id: project.id,
      priority: 'high',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dias
      estimated_hours: 30
    },
    {
      title: 'Desenvolvimento',
      description: 'Implementação das funcionalidades conforme especificações',
      status: 'pending',
      project_id: project.id,
      priority: 'high',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
      estimated_hours: 80
    },
    {
      title: 'Testes e QA',
      description: 'Testes de qualidade, performance e correção de bugs',
      status: 'pending',
      project_id: project.id,
      priority: 'medium',
      deadline: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(), // 37 dias
      estimated_hours: 20
    },
    {
      title: 'Deploy e Publicação',
      description: 'Publicação do projeto em ambiente de produção',
      status: 'pending',
      project_id: project.id,
      priority: 'medium',
      deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 dias
      estimated_hours: 10
    }
  ];

  // Create tasks
  const { error: tasksError } = await supabase.from('tasks').insert(tasks);
  if (tasksError) throw tasksError;

  // Notify about tasks creation
  await createNotification({
    userId: project.user_id,
    type: 'tasks_created',
    title: 'Tarefas Criadas',
    message: 'As tarefas iniciais do seu projeto foram criadas. Acompanhe o progresso na área de tarefas.',
    projectId: project.id,
    metadata: {
      task_count: tasks.length,
      estimated_total_hours: tasks.reduce((acc, task) => acc + task.estimated_hours, 0)
    }
  });
}