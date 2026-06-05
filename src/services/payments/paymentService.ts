export type PaymentMethod = 'mercadopago' | 'nequi' | 'paypal' | 'wompi' | 'cash' | 'card';

export interface PaymentConfig {
  MercadoPago?: {
    accessToken: string;
    publicKey: string;
  };
  NEQUI?: {
    apiKey: string;
    phone: string;
  };
  PayPal?: {
    clientId: string;
    clientSecret: string;
  };
  Wompi?: {
    merchantId: string;
    publicKey: string;
  };
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  method: PaymentMethod;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  message: string;
  qrCode?: string;
}

class PaymentService {
  private config: PaymentConfig;

  constructor() {
    this.config = {
      MercadoPago: {
        accessToken: import.meta.env.VITE_MP_ACCESS_TOKEN || '',
        publicKey: import.meta.env.VITE_MP_PUBLIC_KEY || '',
      },
      NEQUI: {
        apiKey: import.meta.env.VITE_NEQUI_API_KEY || '',
        phone: import.meta.env.VITE_NEQUI_PHONE || '',
      },
      PayPal: {
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
        clientSecret: import.meta.env.VITE_PAYPAL_CLIENT_SECRET || '',
      },
      Wompi: {
        merchantId: import.meta.env.VITE_WOMPI_MERCHANT_ID || '',
        publicKey: import.meta.env.VITE_WOMPI_PUBLIC_KEY || '',
      },
    };
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    switch (request.method) {
      case 'mercadopago':
        return this.processMercadoPago(request);
      case 'nequi':
        return this.processNEQUI(request);
      case 'paypal':
        return this.processPayPal(request);
      case 'wompi':
        return this.processWompi(request);
      case 'cash':
      case 'card':
        return this.processCashOrCard(request);
      default:
        return { success: false, message: 'Método de pago no soportado' };
    }
  }

  private async processMercadoPago(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.config.MercadoPago?.accessToken) {
      return { success: false, message: 'MercadoPago no configurado' };
    }

    try {
      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.MercadoPago.accessToken}`,
        },
        body: JSON.stringify({
          transaction_amount: request.amount,
          description: `Pedido Guido Pizza #${request.orderId}`,
          payment_method_id: 'pix',
          payer: {
            email: request.customerEmail,
          },
          external_reference: request.orderId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          transactionId: data.id,
          message: 'Pago con MercadoPago procesado',
          qrCode: data.point_of_interaction?.transaction_data?.qr_code,
        };
      }

      return { success: false, message: data.message || 'Error en pago' };
    } catch (error) {
      return { success: false, message: 'Error de conexión' };
    }
  }

  private async processNEQUI(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.config.NEQUI?.apiKey) {
      return { success: false, message: 'NEQUI no configurado' };
    }

    return {
      success: true,
      transactionId: `NEQUI-${Date.now()}`,
      message: 'Solicitud de pago NEQUI enviada. Confirma en tu app.',
    };
  }

  private async processPayPal(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.config.PayPal?.clientId) {
      return { success: false, message: 'PayPal no configurado' };
    }

    const returnUrl = `${window.location.origin}/payment/success`;
    const cancelUrl = `${window.location.origin}/payment/cancel`;

    return {
      success: true,
      paymentUrl: `https://www.paypal.com/checkoutnow?token=${request.orderId}`,
      message: 'Redirigiendo a PayPal...',
    };
  }

  private async processWompi(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.config.Wompi?.merchantId) {
      return { success: false, message: 'Wompi no configurado' };
    }

    try {
      const response = await fetch('https://sandbox.wompi.co/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount_in_cents: Math.round(request.amount * 100),
          currency: 'COP',
          customer_email: request.customerEmail,
          payment_method: {
            type: 'CARD',
          },
          reference: request.orderId,
          redirect_url: `${window.location.origin}/payment/return`,
        }),
      });

      const data = await response.json();

      if (data.status === 'approved') {
        return {
          success: true,
          transactionId: data.id,
          message: 'Pago aprobado',
        };
      }

      return {
        success: true,
        paymentUrl: data.redirect_url,
        message: 'Redirigiendo al pago...',
      };
    } catch (error) {
      return { success: false, message: 'Error de conexión' };
    }
  }

  private processCashOrCard(request: PaymentRequest): PaymentResponse {
    return {
      success: true,
      transactionId: `CASH-${Date.now()}`,
      message: request.method === 'cash' 
        ? 'Pago en efectivo al recibir' 
        : 'Pago con tarjeta al recibir',
    };
  }

  getPaymentMethods(): { id: PaymentMethod; name: string; icon: string }[] {
    return [
      { id: 'cash', name: 'Efectivo', icon: 'fas fa-money-bill-wave' },
      { id: 'mercadopago', name: 'MercadoPago', icon: 'fab fa-mercury' },
      { id: 'nequi', name: 'NEQUI', icon: 'fas fa-mobile-alt' },
      { id: 'paypal', name: 'PayPal', icon: 'fab fa-paypal' },
      { id: 'wompi', name: 'Wompi', icon: 'fas fa-credit-card' },
      { id: 'card', name: 'Tarjeta', icon: 'fas fa-credit-card' },
    ];
  }
}

export const paymentService = new PaymentService();
export default paymentService;
