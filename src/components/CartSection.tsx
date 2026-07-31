import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import BoldCheckoutButton from './payments/BoldCheckoutButton';
import TrackOrderModal from './TrackOrderModal';
import { api } from '../services/api';
import type { OrderDraft } from '../services/payments/paymentService';
import { PizzaSize, OrderItem } from '../types';
import { generateOrderNumber } from '../utils/orderNumber';

const CartSection: React.FC = () => {
  const { cart, cartCount, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [toast, setToast] = useState('');
  const [showTrackOrder, setShowTrackOrder] = useState(false);

  const canCheckout = !!customerName && !!customerAddress && !!customerPhone;

  const buildOrderDraft = (): OrderDraft => {
    const items: OrderItem[] = cart.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      // [2026-07-21] Audit follow-up M1: el CartSection legacy hardcodeaba
      // PizzaSize.PERSONAL para TODOS los items, descartando la selección
      // real del usuario en el CTP builder (Familiar/Mediana/Junior/Small).
      // El menu digital ya respeta item.size; acá aplicamos la misma
      // política con fallback al legacy para items seed pre-pivot.
      size: item.size || PizzaSize.PERSONAL,
      quantity: item.quantity,
      price: item.price,
      details: item.details,
    }));

    // [2026-07-21] Frontend audit P0 #8: orderNumber con crypto.randomUUID,
    // extraído a src/utils/orderNumber.ts para no duplicar entre
    // MenuDigital y CartSection. El server genera el orderNumber
    // canónico en /api/orders POST; este helper es sólo el prefijo
    // display que aparece en WhatsApp antes de confirmar.
    const orderNumber = generateOrderNumber();

    return {
      orderNumber,
      customerName,
      customerPhone,
      address: customerAddress,
      items,
      total: cartTotal,
      estimatedTime: 30,
    };
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleWhatsApp = async () => {
    if (!customerName || !customerAddress || !customerPhone) {
      showToast('Completa todos los datos del pedido');
      return;
    }
    // [2026-07-30] Backlog: window.open DESPUÉS de un await pierde el user
    // gesture y los popup blockers lo bloquean (audit P2). Se arma el
    // mensaje y se abre la ventana en blanco SINCRÓNICAMENTE (dentro del
    // gesture del click) antes del await; se navega tras el registro.
    let msg = `🍕 *Nuevo Pedido Juancho's Pizza*\n\n*Cliente:* ${customerName}\n*Dirección:* ${customerAddress}\n\n`;
    cart.forEach((item, i) => {
      msg += `*${i + 1}. ${item.name}* x${item.quantity} — $${(item.price * item.quantity).toLocaleString()}\n`;
      if (item.details) msg += `   _${item.details}_\n`;
    });
    msg += `\n*Total: $${cartTotal.toLocaleString()}*\n\n⏱️ _Tiempo estimado: 25-35 min_`;
    const url = `https://wa.me/573117074843?text=${encodeURIComponent(msg)}`;
    const waWin = window.open('', '_blank');

    setIsProcessing(true);
    try {
      await api.createOrder({ ...buildOrderDraft(), paymentMethod: 'whatsapp' });
      showToast('Pedido registrado ✓');
    } catch {
      showToast('Error al registrar, pero puedes pedir por WhatsApp');
    } finally {
      setIsProcessing(false);
    }
    if (waWin) {
      waWin.location.href = url;
    } else {
      // Popup bloqueado por el navegador: último recurso, navegamos en la
      // misma pestaña (el pedido ya se registró vía createOrder).
      window.location.href = url;
    }
  };

  return (
    <section id="carrito" style={{ scrollMarginTop: '70px' }}>
      <div
        style={{
          background: 'linear-gradient(160deg, #F4EFEA 0%, #f5e6d5 50%, #F4EFEA 100%)',
          borderTop: '6px solid #8B572A',
          padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5%, 80px)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section__header" style={{ textAlign: 'center', marginBottom: 'clamp(24px, 5vw, 50px)' }}>
            <h2
              style={{
                fontFamily: "'Bitter', serif",
                color: '#1A1A1A',
                fontSize: 'clamp(1.6rem, 5vw, 3.2rem)',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '10px',
              }}
            >
              Tu Carrito
            </h2>
            <p
              style={{
                color: '#8B7355',
                fontStyle: 'italic',
                fontFamily: "'Bitter', serif",
                fontSize: 'clamp(.85rem, 2vw, 1.05rem)',
              }}
            >
              {cartCount === 0
                ? 'No hay productos aún'
                : `${cartCount} producto${cartCount !== 1 ? 's' : ''} seleccionado${cartCount !== 1 ? 's' : ''}`}
            </p>
            <button
              onClick={() => setShowTrackOrder(true)}
              style={{
                marginTop: '12px',
                border: 'none',
                background: 'transparent',
                color: '#C0392B',
                fontWeight: 700,
                fontSize: '.8rem',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              ¿Ya pediste? Rastrea tu pedido
            </button>
          </div>

          {showTrackOrder && <TrackOrderModal onClose={() => setShowTrackOrder(false)} />}

          {cart.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'clamp(40px, 8vw, 80px) 20px',
                background: 'rgba(255,255,255,.7)',
                borderRadius: 'clamp(24px, 3vw, 32px)',
                border: '2px dashed rgba(139,87,42,.15)',
              }}
            >
              <div style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: '20px', opacity: '.15' }}>
                <i className="fas fa-basket-shopping"></i>
              </div>
              <p
                style={{
                  color: '#1A1A1A',
                  fontWeight: '700',
                  fontSize: 'clamp(.95rem, 2vw, 1.1rem)',
                  marginBottom: '8px',
                }}
              >
                Tu carrito está vacío
              </p>
              <p style={{ color: '#8B7355', fontSize: 'clamp(.8rem, 2vw, .9rem)' }}>
                Explora nuestro menú y agrega productos deliciosos
              </p>
              <a
                href="#menu"
                className="btn-primary"
                style={{ marginTop: '24px', display: 'inline-flex' }}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                VER MENÚ <i className="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:gap-4">
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl"
                  style={{
                    background: 'rgba(255,255,255,.85)',
                    border: '1px solid rgba(139,87,42,.1)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 16px rgba(139,87,42,.06)',
                  }}
                >
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 text-sm sm:text-base"
                    style={{ background: 'rgba(192,57,43,.08)', color: '#C0392B' }}
                  >
                    <i className="fas fa-pizza-slice"></i>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-bold truncate" style={{ color: '#1A1A1A', margin: 0 }}>
                      {item.name}
                    </h4>
                    {item.details && (
                      <p
                        className="text-[10px] sm:text-xs truncate"
                        style={{ color: '#8B572A', margin: '2px 0 0 0', opacity: 0.6 }}
                      >
                        {item.details}
                      </p>
                    )}
                    <p className="text-sm sm:text-base font-bold" style={{ color: '#C0392B', margin: '4px 0 0' }}>
                      ${(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs hover:bg-red-600 hover:text-white transition-colors"
                      style={{ border: '1px solid rgba(139,87,42,.12)', background: 'white', color: '#8B572A' }}
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <span
                      className="text-sm sm:text-base font-bold w-6 sm:w-7 text-center"
                      style={{ color: '#1A1A1A' }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs hover:bg-red-600 hover:text-white transition-colors"
                      style={{ border: '1px solid rgba(139,87,42,.12)', background: 'white', color: '#8B572A' }}
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs hover:bg-red-500 hover:text-white transition-colors flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,.08)', color: '#ef4444', border: 'none' }}
                  >
                    <i className="fas fa-trash-can"></i>
                  </button>
                </motion.div>
              ))}

              {/* Cart Summary + Checkout */}
              <div
                className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl"
                style={{
                  marginTop: 'clamp(8px, 2vw, 16px)',
                  background: 'rgba(255,255,255,.9)',
                  border: '1px solid rgba(139,87,42,.12)',
                  boxShadow: '0 8px 32px rgba(139,87,42,.08)',
                }}
              >
                <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
                  <div>
                    <p className="text-[11px] sm:text-xs" style={{ color: '#8B572A', fontWeight: '500', margin: 0 }}>
                      Subtotal
                    </p>
                    <p
                      className="text-[10px] sm:text-[11px]"
                      style={{ color: '#8B572A', margin: '4px 0 0', opacity: 0.6 }}
                    >
                      Envío gratis
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-2xl sm:text-3xl font-bold"
                      style={{ color: '#C0392B', fontFamily: "'Bitter', serif", margin: 0 }}
                    >
                      ${cartTotal.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:gap-3">
                  {/* [2026-07-21] A11y WCAG 3.3.2: label programático con
                      sr-only para cada input del checkout. También añado
                      `required aria-required` y `autoComplete` para mejorar
                      la experiencia móvil y la compatibilidad con password
                      managers. */}
                  <label htmlFor="cs-checkout-name" className="sr-only">
                    Tu nombre
                  </label>
                  <input
                    id="cs-checkout-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Tu nombre *"
                    required
                    aria-required="true"
                    autoComplete="name"
                    className="w-full p-3 sm:p-3.5 text-sm rounded-xl sm:rounded-2xl outline-none transition-colors"
                    style={{
                      border: '1px solid rgba(139,87,42,.12)',
                      background: 'rgba(244,239,234,.6)',
                      fontWeight: '500',
                      color: '#1A1A1A',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(192,57,43,.3)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(139,87,42,.12)')}
                  />
                  <label htmlFor="cs-checkout-address" className="sr-only">
                    Dirección de entrega
                  </label>
                  <input
                    id="cs-checkout-address"
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Dirección de entrega *"
                    required
                    aria-required="true"
                    autoComplete="street-address"
                    className="w-full p-3 sm:p-3.5 text-sm rounded-xl sm:rounded-2xl outline-none transition-colors"
                    style={{
                      border: '1px solid rgba(139,87,42,.12)',
                      background: 'rgba(244,239,234,.6)',
                      fontWeight: '500',
                      color: '#1A1A1A',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(192,57,43,.3)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(139,87,42,.12)')}
                  />
                  <label htmlFor="cs-checkout-phone" className="sr-only">
                    Teléfono para pago y seguimiento
                  </label>
                  <input
                    id="cs-checkout-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Teléfono (para pago y seguimiento) *"
                    required
                    aria-required="true"
                    autoComplete="tel"
                    className="w-full p-3 sm:p-3.5 text-sm rounded-xl sm:rounded-2xl outline-none transition-colors"
                    style={{
                      border: '1px solid rgba(139,87,42,.12)',
                      background: 'rgba(244,239,234,.6)',
                      fontWeight: '500',
                      color: '#1A1A1A',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(192,57,43,.3)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(139,87,42,.12)')}
                  />

                  <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <BoldCheckoutButton
                      orderDraft={buildOrderDraft()}
                      disabled={!canCheckout}
                      className="flex-1"
                      onOrderCreated={() => clearCart()}
                      onError={(msg) => showToast(msg)}
                    />
                    <button
                      onClick={handleWhatsApp}
                      disabled={!canCheckout || isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all"
                      style={{
                        border: 'none',
                        background: !canCheckout || isProcessing ? '#ccc' : '#25D366',
                        color: 'white',
                        cursor: !canCheckout || isProcessing ? 'not-allowed' : 'pointer',
                        boxShadow: !canCheckout || isProcessing ? 'none' : '0 4px 20px rgba(37,211,102,.3)',
                      }}
                      onMouseOver={(e) => {
                        if (customerName && customerAddress) {
                          (e.target as HTMLElement).style.background = '#1ebd58';
                          (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseOut={(e) => {
                        (e.target as HTMLElement).style.background =
                          !customerName || !customerAddress ? '#ccc' : '#25D366';
                        (e.target as HTMLElement).style.transform = 'none';
                      }}
                    >
                      <i className="fab fa-whatsapp text-base sm:text-lg"></i>
                      Pedir por WhatsApp
                    </button>
                    <button
                      onClick={clearCart}
                      className="px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all"
                      style={{
                        border: '1px solid rgba(139,87,42,.12)',
                        background: 'transparent',
                        color: '#8B572A',
                        cursor: 'pointer',
                      }}
                      onMouseOver={(e) => {
                        (e.target as HTMLElement).style.background = 'rgba(239,68,68,.08)';
                        (e.target as HTMLElement).style.color = '#ef4444';
                      }}
                      onMouseOut={(e) => {
                        (e.target as HTMLElement).style.background = 'transparent';
                        (e.target as HTMLElement).style.color = '#8B572A';
                      }}
                    >
                      Vaciar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              bottom: '90px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1A1A1A',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: '600',
              zIndex: 100,
              boxShadow: '0 8px 32px rgba(0,0,0,.2)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default CartSection;
