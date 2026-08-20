import { memo } from 'react';
import { Link } from 'react-router-dom';

const HeroVideo = memo(function HeroVideo() {
  return (
    <video
      className="absolute inset-0 w-full h-full object-cover"
      src="/pizza-logo.mp4"
      poster="/pizza-logo-poster.webp"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
    />
  );
});

const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <HeroVideo />

      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-carbon/40 via-transparent to-carbon/60" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Badge */}
        <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-queso/20 border border-queso/30 text-queso text-xs font-body font-semibold tracking-widest uppercase">
          🍕 Pizzas • Hamburguesas • Salchipapas
        </span>

        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-tight mb-6">
          <span className="text-crema drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]">El Sabor Que </span>
          <span className="bg-gradient-to-r from-queso via-queso-500 to-tomato bg-clip-text text-transparent drop-shadow-none">
            No Tiene Igual
          </span>
        </h1>

        <p className="text-crema/90 text-lg md:text-xl mb-10 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] max-w-2xl mx-auto">
          Pizzas artesanales, hamburguesas jugosas, salchipapas, perros calientes y más.
          <span className="text-queso font-semibold">Pedido rápido</span> a Nemocón y Zipaquirá.
        </p>

        <div className="flex items-center justify-center">
          <Link
            to="/menu"
            className="group inline-flex items-center gap-2 bg-queso text-carbon font-heading text-xl md:text-2xl uppercase tracking-wider px-10 py-4 rounded-xl hover:bg-queso-500 hover:shadow-[0_0_30px_rgba(244,169,36,0.4)] transition-all duration-300"
          >
            Ver Menú
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default memo(Hero);
