import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
  options: {
    timeout: 10000,
    idempotencyKey: uuidv4()
  }
});

const payment = new Payment(client);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, products, formData, project_id } = body;

    if (!project_id) {
      throw new Error("Project ID is required to create a payment");
    }
    
    const planPrices = {
      'Básico': 1, // R$ 4.997,00
      'Profissional': 999700, // R$ 9.997,00
      'Enterprise': 1999700 // R$ 19.997,00
    };

    const amount = planPrices[plan as keyof typeof planPrices] / 100; // Convertendo para decimal
    const externalReference = uuidv4(); // Usando UUID para referência única

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
          number: formData.cpf || '09932960926' // Substituindo pelo CPF real se disponível
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
        project_id: project_id
      }
    };

    const requestOptions = {
      idempotencyKey: externalReference
    };

    const response = await payment.create({ body: paymentData, requestOptions });

    console.log(response.id)
    if (!response.point_of_interaction?.transaction_data?.qr_code) {
      throw new Error('PIX data not found in payment response');
    }

    return NextResponse.json({
      qr_code: response.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64,
      payment_id: response.id,
      expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
      amount: planPrices[plan as keyof typeof planPrices], // Mantendo em centavos
      project_id
    });
  } catch (error) {
      let errorMessage = 'Error creating payment';
    
      if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}