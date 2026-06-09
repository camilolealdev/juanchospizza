import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';

const SECTIONS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'crea-tu-pizza', label: 'Crea tu Pizza' },
  { id: 'menu', label: 'Menú' },
  { id: 'domicilios', label: 'Domicilios' },
  { id: 'carrito', label: 'Carrito' },
];

const CartSection: React.FC = () => {
  const { cart, cartCount, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleWhatsApp = () => {
    if (!customerName || !customerAddress) {
      showToast('Completa nombre y dirección');
      return;
    }
    let msg = `🍕 *Nuevo Pedido Juancho's Pizza*\n\n*Cliente:* ${customerName}\n*Dirección:* ${customerAddress}\n\n`;
    cart.forEach((item, i) => {
      msg += `*${i + 1}. ${item.name}* x${item.quantity} — $${(item.price * item.quantity).toLocaleString()}\n`;
      if (item.details) msg += `   _${item.details}_\n`;
    });
    msg += `\n*Total: $${cartTotal.toLocaleString()}*\n\n⏱️ _Tiempo estimado: 25-35 min_`;
    const url = `https://wa.me/573117074843?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    showToast('Pedido enviado a WhatsApp ✓');
  };

  return (
    <section id="carrito" style={{ scrollMarginTop: '70px' }}>
      <div style={{
        background: 'linear-gradient(160deg, #F4EFEA 0%, #f5e6d5 50%, #F4EFEA 100%)',
        borderTop: '6px solid #8B572A',
        padding: '80px 5%'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section__header" style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{
              fontFamily: "'Bitter', serif",
              color: '#1A1A1A',
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '10px'
            }}>
              Tu Carrito
            </h2>
            <p style={{ color: '#8B7355', fontStyle: 'italic', fontFamily: "'Bitter', serif", fontSize: '1.05rem' }}>
              {cartCount === 0 ? 'No hay productos aún' : `${cartCount} producto${cartCount !== 1 ? 's' : ''} seleccionado${cartCount !== 1 ? 's' : ''}`}
            </p>
          </div>

          {cart.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: 'rgba(255,255,255,.7)',
              borderRadius: '32px',
              border: '2px dashed rgba(139,87,42,.15)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: '.15' }}>
                <i className="fas fa-basket-shopping"></i>
              </div>
              <p style={{ color: '#1A1A1A', fontWeight: '700', fontSize: '1.1rem', marginBottom: '8px' }}>Tu carrito está vacío</p>
              <p style={{ color: '#8B7355', fontSize: '.9rem' }}>Explora nuestro menú y agrega productos deliciosos</p>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px 24px',
                    background: 'rgba(255,255,255,.85)',
                    borderRadius: '24px',
                    border: '1px solid rgba(139,87,42,.1)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 16px rgba(139,87,42,.06)'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    background: 'rgba(192,57,43,.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C0392B',
                    flexShrink: 0
                  }}>
                    <i className="fas fa-pizza-slice"></i>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>{item.name}</h4>
                    {item.details && (
                      <p style={{ fontSize: '11px', color: '#8B572A', margin: '2px 0 0 0', opacity: .6 }}>{item.details}</p>
                    )}
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#C0392B', margin: '4px 0 0' }}>
                      ${(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '10px', border: '1px solid rgba(139,87,42,.12)',
                        background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', color: '#8B572A', transition: 'all .3s'
                      }}
                      onMouseOver={e => { (e.target as HTMLElement).style.background = '#C0392B'; (e.target as HTMLElement).style.color = 'white'; }}
                      onMouseOut={e => { (e.target as HTMLElement).style.background = 'white'; (e.target as HTMLElement).style.color = '#8B572A'; }}
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', width: '28px', textAlign: 'center' }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '10px', border: '1px solid rgba(139,87,42,.12)',
                        background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', color: '#8B572A', transition: 'all .3s'
                      }}
                      onMouseOver={e => { (e.target as HTMLElement).style.background = '#C0392B'; (e.target as HTMLElement).style.color = 'white'; }}
                      onMouseOut={e => { (e.target as HTMLElement).style.background = 'white'; (e.target as HTMLElement).style.color = '#8B572A'; }}
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '10px', border: 'none',
                      background: 'rgba(239,68,68,.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', color: '#ef4444', flexShrink: 0, transition: 'all .3s'
                    }}
                    onMouseOver={e => { (e.target as HTMLElement).style.background = '#ef4444'; (e.target as HTMLElement).style.color = 'white'; }}
                    onMouseOut={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,.08)'; (e.target as HTMLElement).style.color = '#ef4444'; }}
                  >
                    <i className="fas fa-trash-can"></i>
                  </button>
                </motion.div>
              ))}

              {/* Cart Summary + Checkout */}
              <div style={{
                marginTop: '16px',
                padding: '32px',
                background: 'rgba(255,255,255,.9)',
                borderRadius: '28px',
                border: '1px solid rgba(139,87,42,.12)',
                boxShadow: '0 8px 32px rgba(139,87,42,.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#8B572A', fontWeight: '500', margin: 0 }}>Subtotal</p>
                    <p style={{ fontSize: '11px', color: '#8B572A', margin: '4px 0 0', opacity: .6 }}>Envío gratis</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#C0392B', fontFamily: "'Bitter', serif", margin: 0 }}>
                      ${cartTotal.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Tu nombre *"
                    style={{
                      width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(139,87,42,.12)',
                      background: 'rgba(244,239,234,.6)', fontSize: '14px', fontWeight: '500', color: '#1A1A1A',
                      outline: 'none', transition: 'all .3s'
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(192,57,43,.3)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(139,87,42,.12)'}
                  />
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    placeholder="Dirección de entrega *"
                    style={{
                      width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(139,87,42,.12)',
                      background: 'rgba(244,239,234,.6)', fontSize: '14px', fontWeight: '500', color: '#1A1A1A',
                      outline: 'none', transition: 'all .3s'
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(192,57,43,.3)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(139,87,42,.12)'}
                  />

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      onClick={handleWhatsApp}
                      disabled={!customerName || !customerAddress}
                      style={{
                        flex: 1, padding: '16px 24px', borderRadius: '16px', border: 'none',
                        background: !customerName || !customerAddress ? '#ccc' : '#25D366',
                        color: 'white', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase',
                        letterSpacing: '2px', cursor: !customerName || !customerAddress ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        transition: 'all .3s', boxShadow: !customerName || !customerAddress ? 'none' : '0 4px 20px rgba(37,211,102,.3)'
                      }}
                      onMouseOver={e => {
                        if (customerName && customerAddress) {
                          (e.target as HTMLElement).style.background = '#1ebd58';
                          (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseOut={e => {
                        (e.target as HTMLElement).style.background = !customerName || !customerAddress ? '#ccc' : '#25D366';
                        (e.target as HTMLElement).style.transform = 'none';
                      }}
                    >
                      <i className="fab fa-whatsapp" style={{ fontSize: '18px' }}></i>
                      Pedir por WhatsApp
                    </button>
                    <button
                      onClick={clearCart}
                      style={{
                        padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(139,87,42,.12)',
                        background: 'transparent', color: '#8B572A', fontWeight: '600', fontSize: '11px',
                        cursor: 'pointer', transition: 'all .3s', whiteSpace: 'nowrap'
                      }}
                      onMouseOver={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,.08)'; (e.target as HTMLElement).style.color = '#ef4444'; }}
                      onMouseOut={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = '#8B572A'; }}
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
              position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
              background: '#1A1A1A', color: 'white', padding: '12px 24px', borderRadius: '16px',
              fontSize: '13px', fontWeight: '600', zIndex: 9999,
              boxShadow: '0 8px 32px rgba(0,0,0,.2)'
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
