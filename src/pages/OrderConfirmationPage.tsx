import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Recibido',
  CONFIRMED: 'Confirmado',
  PREPARING: 'En preparación',
  READY: 'Listo',
  ASSIGNED: 'Asignado a repartidor',
  DELIVERING: 'En camino',
  COMPLETED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: 'Pago confirmado', color: '#16a34a' },
  pending: { label: 'Esperando confirmación del pago', color: '#d97706' },
  failed: { label: 'El pago falló o fue rechazado', color: '#dc2626' },
};

type TrackedOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  estimatedTime: number;
  paymentStatus: string | null;
  paymentMethod: string;
};

// Landed on after BoldCheckoutButton opens the provider's payment page in a
// new tab -- this tab stays put and polls the guest tracking endpoint so the
// customer always has somewhere to watch payment/order status, regardless of
// whether the provider redirects back to us.
const OrderConfirmationPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const orderNumber = params.get('orderNumber') || '';
  const phone = params.get('phone') || '';

  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [isPolling, setIsPolling] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const poll = useCallback(async () => {
    try {
      const result = await api.trackOrder(orderNumber, phone);
      setOrder(result);
      setError('');
      const settled =
        result.paymentStatus === 'paid' || result.paymentStatus === 'failed' || result.status === 'CANCELLED';
      if (settled) {
        setIsPolling(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No encontramos ese pedido');
    }
  }, [orderNumber, phone]);

  useEffect(() => {
    if (!orderNumber || !phone) {
      setError('Falta información del pedido en el enlace.');
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const startPolling = async () => {
      await poll();
      if (cancelled) return;
      if (isPolling) {
        timer = setTimeout(startPolling, 5000);
      }
    };

    startPolling();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderNumber, phone, poll, isPolling]);

  // Botón "Verificar ahora" para polling manual
  const handleManualVerify = async () => {
    setIsVerifying(true);
    await poll();
    setIsVerifying(false);
  };

  const payment = order?.paymentStatus ? PAYMENT_LABELS[order.paymentStatus] : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #F4EFEA 0%, #f5e6d5 50%, #F4EFEA 100%)',
        padding: '24px',
        fontFamily: "'Bitter', serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'white',
          borderRadius: '28px',
          padding: '40px 32px',
          boxShadow: '0 8px 32px rgba(139,87,42,.12)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🍕</div>
        <h1 style={{ fontSize: '1.5rem', color: '#1A1A1A', marginBottom: '8px' }}>
          {orderNumber ? `Pedido ${orderNumber}` : 'Confirmación de pedido'}
        </h1>

        {error && !order && <p style={{ color: '#8B7355', fontSize: '.9rem', marginTop: '16px' }}>{error}</p>}

        {order && (
          <div style={{ marginTop: '20px', textAlign: 'left' }}>
            {payment && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  background: `${payment.color}15`,
                  border: `1px solid ${payment.color}40`,
                  color: payment.color,
                  fontWeight: 700,
                  fontSize: '.9rem',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                {payment.label}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid rgba(139,87,42,.1)',
              }}
            >
              <span style={{ color: '#8B7355', fontSize: '.85rem' }}>Estado del pedido</span>
              <span style={{ color: '#1A1A1A', fontWeight: 700, fontSize: '.85rem' }}>
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: '#8B7355', fontSize: '.85rem' }}>Tiempo estimado</span>
              <span style={{ color: '#1A1A1A', fontWeight: 700, fontSize: '.85rem' }}>{order.estimatedTime} min</span>
            </div>

            {order.paymentStatus === 'pending' && (
              <div>
                <p style={{ color: '#8B7355', fontSize: '.8rem', marginTop: '16px', textAlign: 'center' }}>
                  Completa el pago en la pestaña de Bold que se abrió.
                </p>
                <p style={{ color: '#8B7355', fontSize: '.8rem', textAlign: 'center' }}>
                  Esta página se actualiza sola cuando se confirme el pago.
                </p>
                <button
                  onClick={handleManualVerify}
                  disabled={isVerifying}
                  style={{
                    display: 'block',
                    margin: '16px auto 0',
                    border: '1px solid rgba(192,57,43,.3)',
                    background: isVerifying ? 'rgba(192,57,43,.05)' : 'transparent',
                    color: '#C0392B',
                    fontWeight: 700,
                    fontSize: '.75rem',
                    padding: '10px 24px',
                    borderRadius: '12px',
                    cursor: isVerifying ? 'wait' : 'pointer',
                    transition: 'all .2s',
                  }}
                  onMouseOver={(e) => {
                    if (!isVerifying) (e.target as HTMLElement).style.background = 'rgba(192,57,43,.08)';
                  }}
                  onMouseOut={(e) => {
                    if (!isVerifying) (e.target as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {isVerifying ? 'Verificando...' : '↻ Verificar ahora'}
                </button>
              </div>
            )}
          </div>
        )}

        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '28px',
            color: '#C0392B',
            fontWeight: 700,
            fontSize: '.85rem',
            textDecoration: 'none',
          }}
        >
          ← Volver al menú
        </a>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
