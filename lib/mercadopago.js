// lib/mercadopago.js
import mercadopago from 'mercadopago';

// Configuração do Mercado Pago
mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN);
mercadopago.configurations.setLocale('pt-BR');

export default mercadopago;
