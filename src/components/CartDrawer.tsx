import React from 'react';
import { useCartStore } from '../store/cartStore';
import { useSedeStore } from '../store/sedeStore';
import { buildWhatsAppMessage, formatPrice, WHATSAPP_NUMBERS } from '../data/menu-data';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { items, updateQuantity, removeItem, clearCart, total, count } = useCartStore();
  const sede = useSedeStore((s) => s.sede);

  const handleOrder = () => {
    const message = buildWhatsAppMessage(items, sede);
    const number = WHATSAPP_NUMBERS[sede];
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-crema shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-carbon/10">
          <div>
            <h2 className="font-heading text-3xl text-carbon">Tu Pedido</h2>
            <span className="text-carbon/60 text-sm">
              {count()} {count() === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-carbon/60 hover:text-carbon transition-colors p-1"
            aria-label="Cerrar carrito"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <span className="text-6xl">🍕</span>
              <p className="font-heading text-2xl text-carbon">Tu carrito está vacío</p>
              <button
                onClick={onClose}
                className="bg-tomato text-white font-heading text-lg px-6 py-3 rounded-xl hover:bg-tomato/90 transition-colors"
              >
                ¡Agrega algo del menú!
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-heading text-lg text-carbon">{item.name}</h4>
                      {item.details && (
                        <p className="text-carbon/50 text-xs truncate">{item.details}</p>
                      )}
                      {item.notes && (
                        <p className="text-carbon/40 text-xs italic mt-0.5 truncate">📝 {item.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-carbon/40 hover:text-tomato transition-colors ml-2 flex-shrink-0"
                      aria-label="Eliminar item"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-carbon/10 text-carbon font-bold flex items-center justify-center hover:bg-carbon/20 transition-colors"
                      >
                        -
                      </button>
                      <span className="text-carbon font-heading text-lg w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-carbon/10 text-carbon font-bold flex items-center justify-center hover:bg-carbon/20 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-heading text-lg text-carbon">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="sticky bottom-0 bg-crema border-t border-carbon/10 px-6 py-4 space-y-3">
            <div className="flex justify-between text-carbon/60 text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(total())}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-heading text-2xl text-carbon">Total</span>
              <span className="font-heading text-2xl text-tomato">{formatPrice(total())}</span>
            </div>
            <button
              onClick={handleOrder}
              className="w-full bg-green-600 text-white font-heading text-xl py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Pedir por WhatsApp
            </button>
            <p className="text-carbon/50 text-xs text-center leading-relaxed">
              Los pagos y la confirmación final se hacen por WhatsApp. Precios en COP, incluyen IVA.
            </p>
            <div className="text-center">
              <button
                onClick={clearCart}
                className="text-tomato text-sm hover:underline"
              >
                Vaciar carrito
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
