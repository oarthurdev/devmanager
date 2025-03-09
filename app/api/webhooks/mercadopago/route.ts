import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export const dynamic = 'force-dynamic';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
});

const payment = new Payment(client);

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

    // Validação básica
    if (!body || !body.type || body.type !== 'payment' || !body.data?.id) {
      console.warn('Webhook ignorado: formato inválido ou evento não relacionado a pagamento.');
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    // Responder rapidamente para evitar falhas no Mercado Pago
    NextResponse.json({ status: 'received' });

    // Processamento assíncrono para não bloquear a resposta
    setTimeout(async () => {
      try {
        const paymentData = await payment.get({ id: body.data.id });

        if (!paymentData || !paymentData.status || !paymentData.metadata?.project_id) {
          console.error('Erro ao buscar pagamento: dados incompletos.');
          return;
        }

        const supabase = createClient();

        // Atualizar status do projeto baseado no status do pagamento
        let newStatus = '';
        let notificationType = '';
        let notificationTitle = '';
        let notificationMessage = '';

        switch (paymentData.status) {
          case 'approved':
            newStatus = 'in_progress';
            notificationType = 'payment_success';
            notificationTitle = 'Pagamento Confirmado';
            notificationMessage = 'Seu pagamento foi confirmado e seu projeto está em andamento.';
            break;
          case 'pending':
          case 'in_process':
            newStatus = 'pending';
            notificationType = 'payment_pending';
            notificationTitle = 'Pagamento Pendente';
            notificationMessage = 'Aguardando confirmação do pagamento.';
            break;
          case 'rejected':
          case 'cancelled':
          case 'refunded':
          case 'charged_back':
            newStatus = 'cancelled';
            notificationType = 'payment_failed';
            notificationTitle = 'Pagamento Cancelado';
            notificationMessage = 'Houve um problema com seu pagamento. Por favor, tente novamente.';
            break;
        }

        if (newStatus) {
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentData.metadata.project_id)
            .select()
            .single();

          if (projectError) {
            console.error('Erro ao atualizar projeto:', projectError);
            return;
          }

          // Criar notificação
          await supabase
            .from('notifications')
            .insert({
              user_id: project.user_id,
              type: notificationType,
              title: notificationTitle,
              message: notificationMessage,
              project_id: project.id,
              read: false
            });

          // Se o pagamento foi aprovado, criar tarefas iniciais do projeto
          if (paymentData.status === 'approved') {
            const tasks = [
              {
                title: 'Análise de Requisitos',
                description: 'Levantamento e documentação dos requisitos do projeto',
                status: 'pending',
                project_id: project.id,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
              },
              {
                title: 'Design e Prototipagem',
                description: 'Criação dos layouts e protótipos interativos',
                status: 'pending',
                project_id: project.id,
                deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 dias
              },
              {
                title: 'Desenvolvimento',
                description: 'Implementação das funcionalidades',
                status: 'pending',
                project_id: project.id,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
              },
              {
                title: 'Testes',
                description: 'Testes de qualidade e correção de bugs',
                status: 'pending',
                project_id: project.id,
                deadline: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString() // 37 dias
              },
              {
                title: 'Deploy',
                description: 'Publicação do projeto em produção',
                status: 'pending',
                project_id: project.id,
                deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString() // 40 dias
              }
            ];

            await supabase.from('tasks').insert(tasks);
          }
        }
      } catch (error) {
        console.error('Erro no processamento assíncrono do pagamento:', error);
      }
    }, 100);

    return NextResponse.json({ status: 'success' }, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}