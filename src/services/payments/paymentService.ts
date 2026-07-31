export type PaymentMethod = 'mercadopago' | 'nequi' | 'paypal' | 'wompi' | 'bold' | 'cash' | 'card';

export interface OrderDraft {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: import('../../types').OrderItem[];
  total: number;
  estimatedTime: number;
}

export interface PaymentConfig {
  NEQUI?: {
    apiKey: string;
    phone: string;
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
      NEQUI: {
        apiKey: import.meta.env.VITE_NEQUI_API_KEY || '',
        phone: import.meta.env.VITE_NEQUI_PHONE || '',
      },
    };
  }

  private async postToBackend<T>(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; data: T }> {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: response.ok, data: (await response.json()) as T };
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
      case 'bold':
        return this.processBold(request);
      case 'cash':
      case 'card':
        return this.processCashOrCard(request);
      default:
        return { success: false, message: 'Método de pago no soportado' };
    }
  }

  private async processMercadoPago(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { ok, data } = await this.postToBackend<{ error?: string; transactionId?: string; qrCode?: string }>(
        '/api/payments/mercadopago/create-payment',
        {
          orderId: request.orderId,
          customerEmail: request.customerEmail,
        }
      );

      if (!ok) {
        return { success: false, message: data.error || 'MercadoPago no configurado' };
      }

      return {
        success: true,
        transactionId: data.transactionId,
        message: 'Pago con MercadoPago procesado',
        qrCode: data.qrCode,
      };
    } catch (error) {
      return { success: false, message: 'Error de conexión' };
    }
  }

  private async processNEQUI(_request: PaymentRequest): Promise<PaymentResponse> {
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
    try {
      const { ok, data } = await this.postToBackend<{ error?: string; paymentUrl?: string }>(
        '/api/payments/paypal/create-order',
        {
          orderId: request.orderId,
        }
      );

      if (!ok) {
        return { success: false, message: data.error || 'PayPal no configurado' };
      }

      return {
        success: true,
        paymentUrl: data.paymentUrl,
        message: 'Redirigiendo a PayPal...',
      };
    } catch (error) {
      return { success: false, message: 'Error de conexión' };
    }
  }

  private async processWompi(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { ok, data } = await this.postToBackend<{
        error?: string;
        approved?: boolean;
        transactionId?: string;
        paymentUrl?: string;
      }>('/api/payments/wompi/create-transaction', {
        orderId: request.orderId,
        customerEmail: request.customerEmail,
      });

      if (!ok) {
        return { success: false, message: data.error || 'Wompi no configurado' };
      }

      if (data.approved) {
        return { success: true, transactionId: data.transactionId, message: 'Pago aprobado' };
      }

      return { success: true, paymentUrl: data.paymentUrl, message: 'Redirigiendo al pago...' };
    } catch (error) {
      return { success: false, message: 'Error de conexión' };
    }
  }

  private async processBold(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { ok, data } = await this.postToBackend<{
        error?: string;
        url?: string;
        paymentLink?: string;
        reused?: boolean;
        code?: string;
      }>('/api/payments/bold/create-link', {
        orderId: request.orderId,
      });

      if (!ok) {
        const errorMsg = data.code
          ? `Bold: ${data.error || 'Error'} (${data.code})`
          : data.error || 'Bold no configurado';
        return { success: false, message: errorMsg };
      }

      return {
        success: true,
        transactionId: data.paymentLink,
        paymentUrl: data.url,
        message: data.reused ? 'Reusando link de pago existente...' : 'Redirigiendo a Bold...',
      };
    } catch (error) {
      return { success: false, message: 'Error de conexión con Bold' };
    }
  }

  private processCashOrCard(request: PaymentRequest): PaymentResponse {
    return {
      success: true,
      transactionId: `CASH-${Date.now()}`,
      message: request.method === 'cash' ? 'Pago en efectivo al recibir' : 'Pago con tarjeta al recibir',
    };
  }

  getPaymentMethods(): { id: PaymentMethod; name: string; icon: string }[] {
    return [
      { id: 'cash', name: 'Efectivo', icon: 'fas fa-money-bill-wave' },
      // MercadoPago: backend hardcodea payment_method_id='pix' (Brasil,
      // inválido pa Colombia) -- oculto hasta implementarlo de verdad
      // (mismo tratamiento que PayPal, ver auditoría 2026-07-09).
      { id: 'nequi', name: 'NEQUI', icon: 'fas fa-mobile-alt' },
      // PayPal: stub sin API real ni webhook -- oculto hasta implementarlo de verdad (ver auditoría 2026-07-09).
      { id: 'wompi', name: 'Wompi', icon: 'fas fa-credit-card' },
      { id: 'bold', name: 'Bold', icon: 'fas fa-bolt' },
      { id: 'card', name: 'Tarjeta', icon: 'fas fa-credit-card' },
    ];
  }
}

export const paymentService = new PaymentService();
export default paymentService;
