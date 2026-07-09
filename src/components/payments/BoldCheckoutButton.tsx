import React, { useState } from 'react';
import { api } from '../../services/api';
import { paymentService } from '../../services/payments/paymentService';
import type { OrderDraft } from '../../services/payments/paymentService';
import type { Order } from '../../types';

interface BoldCheckoutButtonProps {
  orderDraft: OrderDraft;
  customerEmail?: string;
  disabled?: boolean;
  onOrderCreated?: (order: Order) => void;
  onError?: (message: string) => void;
  className?: string;
}

// Dedicated Bold-only checkout button for surfaces that don't want the full
// multi-method POS modal (see services/payments/POS.tsx for that). Creates
// the real order first, then requests the Bold payment link -- same
// order-before-payment sequencing POS uses, so the link always references a
// real orderId (see PR6 commit message for why that used to 404).
const BoldCheckoutButton: React.FC<BoldCheckoutButtonProps> = ({
  orderDraft,
  customerEmail,
  disabled,
  onOrderCreated,
  onError,
  className,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    if (disabled || isProcessing) return;
    setIsProcessing(true);
    try {
      const order: Order = await api.createOrder({ ...orderDraft, paymentMethod: 'bold' });
      onOrderCreated?.(order);

      const result = await paymentService.processPayment({
        amount: orderDraft.total,
        currency: 'COP',
        orderId: order.id,
        customerEmail: customerEmail || 'cliente@guido.com',
        customerName: orderDraft.customerName,
        method: 'bold',
      });

      if (!result.success || !result.paymentUrl) {
        onError?.(result.message || 'No se pudo iniciar el pago con Bold');
        return;
      }

      // Bold's link-creation endpoint doesn't take a custom return URL, so we
      // don't rely on it redirecting back to us -- open the payment page in a
      // new tab and send this tab to our own confirmation page, which polls
      // order status via the phone-gated tracking endpoint.
      window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
      const params = new URLSearchParams({
        orderNumber: orderDraft.orderNumber,
        phone: orderDraft.customerPhone,
      });
      window.location.href = `/confirmacion?${params.toString()}`;
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Error de conexión con Bold');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={className}
      style={{
        border: 'none',
        background: disabled ? '#ccc' : '#0A2540',
        color: 'white',
        cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 20px',
        borderRadius: '14px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        boxShadow: disabled ? 'none' : '0 4px 20px rgba(10,37,64,.3)',
      }}
    >
      <i className="fas fa-bolt" />
      {isProcessing ? 'Procesando...' : 'Pagar con Bold'}
    </button>
  );
};

export default BoldCheckoutButton;
