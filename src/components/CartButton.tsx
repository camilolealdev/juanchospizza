import { useCartStore } from '../store/cartStore';

interface CartButtonProps {
  onOpenCart?: () => void;
}

export default function CartButton({ onOpenCart }: CartButtonProps) {
  const count = useCartStore((s) => s.count);
  const itemCount = count();

  return (
    <button
      type="button"
      onClick={onOpenCart}
      title="Ir al carrito"
      aria-label={
        itemCount > 0 ? `Abrir carrito con ${itemCount} ${itemCount === 1 ? 'artículo' : 'artículos'}` : 'Abrir carrito'
      }
      className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-tomato text-white shadow-lg transition-all duration-200 hover:bg-tomato-600 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 overflow-hidden"
      style={{
        animation: 'cart-pulse 2s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes cart-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.45); }
          50% { box-shadow: 0 0 0 10px rgba(220,38,38,0); }
        }
      `}</style>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a1 1 0 0 0 1 .81h9.72a1 1 0 0 0 1-.76L23 6H6" />
      </svg>

      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-heading font-bold text-carbon bg-queso rounded-full">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
}
