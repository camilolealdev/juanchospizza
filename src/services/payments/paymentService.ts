// Pago online: SOLO Bold (decisión 2026-08-06) + efectivo/tarjeta local.
// MercadoPago, Wompi y PayPal quedaron fuera (backends eliminados).
export type PaymentMethod = 'bold' | 'cash' | 'card';

export interface OrderDraft {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: import('../../types').OrderItem[];
  total: number;
  estimatedTime: number;
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
  private async postToBackend<T>(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; data: T }> {
    // Mismo patrón que services/api.ts: '' = rutas relativas contra el
    // origin real. El fallback 'http://localhost:3001' horneaba localhost en
    // el bundle y rompía los pagos en producción (cada cliente intentaba su
    // propio localhost).
    const apiBase = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: response.ok, data: (await response.json()) as T };
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    switch (request.method) {
      case 'bold':
        return this.processBold(request);
      case 'cash':
      case 'card':
        return this.processCashOrCard(request);
      default:
        return { success: false, message: 'Método de pago no soportado' };
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
      { id: 'bold', name: 'Bold', icon: 'fas fa-bolt' },
      { id: 'card', name: 'Tarjeta', icon: 'fas fa-credit-card' },
    ];
  }
}

export const paymentService = new PaymentService();
export default paymentService;
