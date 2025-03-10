import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export const dynamic = 'force-dynamic';

// Configuração do cliente do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
});

const payment = new Payment(client);

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
    // Validar a requisição
    const body = await request.json();

    // Validação básica do webhook
    if (!body || !body.type || !body.data?.id) {
      console.warn('Webhook inválido:', body);
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    // Verificar se é uma notificação de pagamento
    if (body.type !== 'payment') {
      console.info('Webhook ignorado - não é um evento de pagamento:', body.type);
      return NextResponse.json({ status: 'ignored' });
    }

    // Responder rapidamente para evitar timeout
    const response = NextResponse.json({ status: 'processing' });

    // Processar o pagamento de forma assíncrona
    processPayment(body.data.id).catch(error => {
      console.error('Erro no processamento assíncrono do pagamento:', error);
    });

    return response;
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processPayment(paymentId: string) {
  const supabase = createClient();

  try {
    // Buscar detalhes do pagamento no Mercado Pago
    const paymentData = await payment.get({ id: paymentId });

    // Validar dados do pagamento
    if (!paymentData || !paymentData.metadata?.project_id) {
      throw new Error('Dados do pagamento incompletos ou inválidos');
    }

    // Mapear status do pagamento para status do projeto
    const projectStatus = getProjectStatus(paymentData.status);
    const notificationInfo = getNotificationInfo(paymentData.status);

    // Atualizar status do projeto
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
      .select()
      .single();

    if (projectError) {
      throw projectError;
    }

    // Criar notificação
    if (project && notificationInfo) {
      await supabase
        .from('notifications')
        .insert({
          user_id: project.user_id,
          type: notificationInfo.type,
          title: notificationInfo.title,
          message: notificationInfo.message,
          project_id: project.id,
          read: false,
          metadata: {
            payment_id: paymentId,
            payment_status: paymentData.status,
            payment_status_detail: paymentData.status_detail
          }
        });
    }

    // Se o pagamento foi aprovado, criar tarefas iniciais do projeto
    if (paymentData.status === 'approved' && project) {
      await createInitialTasks(supabase, project);
    }
  } catch (error) {
    console.error('Erro no processamento do pagamento:', error);
    throw error;
  }
}

function getProjectStatus(paymentStatus: string): string {
  const statusMap: Record<string, string> = {
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

function getNotificationInfo(paymentStatus: string) {
  const notifications: Record<string, { type: string; title: string; message: string }> = {
    approved: {
      type: 'payment_success',
      title: 'Pagamento Aprovado',
      message: 'Seu pagamento foi aprovado e seu projeto está em andamento.'
    },
    pending: {
      type: 'payment_pending',
      title: 'Pagamento Pendente',
      message: 'Aguardando confirmação do pagamento.'
    },
    in_process: {
      type: 'payment_pending',
      title: 'Pagamento em Processamento',
      message: 'Seu pagamento está sendo processado.'
    },
    rejected: {
      type: 'payment_failed',
      title: 'Pagamento Rejeitado',
      message: 'Houve um problema com seu pagamento. Por favor, tente novamente.'
    },
    cancelled: {
      type: 'payment_failed',
      title: 'Pagamento Cancelado',
      message: 'Seu pagamento foi cancelado.'
    },
    refunded: {
      type: 'payment_failed',
      title: 'Pagamento Reembolsado',
      message: 'Seu pagamento foi reembolsado.'
    },
    charged_back: {
      type: 'payment_failed',
      title: 'Pagamento Contestado',
      message: 'Seu pagamento foi contestado junto ao banco emissor.'
    }
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

  await supabase.from('tasks').insert(tasks);
}