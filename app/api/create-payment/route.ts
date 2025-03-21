import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, validateRequestMethod, validateRequiredFields } from '@/lib/auth_utils';

export const dynamic = 'force-dynamic';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
  options: {
    timeout: 10000,
    idempotencyKey: uuidv4()
  }
});

const payment = new Payment(client);

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
    const requiredFields = ['plan', 'products', 'formData', 'project_id'];
    const fieldsError = validateRequiredFields(body, requiredFields);
    if (fieldsError) return fieldsError;

    const { plan, products, formData, project_id } = body;
    
    const planPrices = {
      'Básico': 499700,
      'Profissional': 999700,
      'Enterprise': 1999700
    };

    const amount = planPrices[plan as keyof typeof planPrices] / 100;
    const externalReference = uuidv4();

    const paymentData = {
      transaction_amount: amount,
      description: `Plano ${plan} - ${products.join(', ')}`,
      payment_method_id: 'pix',
      payer: {
        email: formData.email,
        first_name: formData.name.split(' ')[0],
        last_name: formData.name.split(' ')[1] || '',
        identification: {
          type: 'CPF',
          number: formData.cpf || user.profile?.document
        }
      },
      notification_url: `${process.env.PRODUCTION_URL}/api/webhooks/mercadopago`,
      metadata: {
        email: formData.email,
        plan,
        products: products.join(','),
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        project_id: project_id,
        user_id: user.id
      }
    };

    const requestOptions = {
      idempotencyKey: externalReference
    };

    const response = await payment.create({ body: paymentData, requestOptions });

    if (!response.point_of_interaction?.transaction_data?.qr_code) {
      throw new Error('PIX data not found in payment response');
    }

    return NextResponse.json({
      qr_code: response.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64,
      payment_id: response.id,
      expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      amount: planPrices[plan as keyof typeof planPrices],
      project_id
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}