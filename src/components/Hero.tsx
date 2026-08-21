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
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      <HeroVideo />

      {/* Strong overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

      <div className="relative z-10 text-center px-5 max-w-4xl mx-auto">
        {/* Badge */}
        <span className="inline-block mb-4 sm:mb-5 px-4 sm:px-5 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-queso/40 text-queso text-xs sm:text-sm font-body font-semibold tracking-widest uppercase">
          🍕 Pizzas • Hamburguesas • Salchipapas
        </span>

        <h1 className="font-heading text-5xl sm:text-6xl md:text-8xl lg:text-9xl leading-none mb-4 sm:mb-6 uppercase tracking-wider">
          <span className="text-crema drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
            El Sabor Que{' '}
          </span>
          <span className="text-queso drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
            No Tiene Igual
          </span>
        </h1>

        <p className="text-crema text-base sm:text-lg md:text-xl mb-8 sm:mb-10 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] max-w-2xl mx-auto font-body font-medium">
          Pizzas artesanales, hamburguesas jugosas, salchipapas, perros calientes y más.{' '}
          <span className="text-queso font-bold">Pedido rápido</span> a Nemocón y Zipaquirá.
        </p>

        <div className="flex items-center justify-center">
          <Link
            to="/menu"
            className="group inline-flex items-center gap-2 bg-queso text-carbon font-heading text-xl sm:text-2xl md:text-3xl uppercase tracking-wider px-8 sm:px-12 py-3.5 sm:py-4 rounded-xl hover:bg-queso-500 hover:shadow-[0_0_40px_rgba(244,169,36,0.5)] transition-all duration-300"
          >
            Ver Menú
            <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default memo(Hero);
