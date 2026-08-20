import { useState, useEffect, useCallback } from 'react';

const IMAGES = [
  { src: '/images/experiencia-adelante.jpg', alt: "Así se ve tu pedido en Juancho's Pizza" },
  { src: '/images/experiencia-atras.jpg', alt: "Así preparamos tu comida en Juancho's Pizza" },
];

export default function ExperienciaSection() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % IMAGES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [isPaused, next]);

  return (
    <section className="relative bg-carbon overflow-hidden">
      {/* Decorative gradient blurs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-tomato/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-queso/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-28 relative z-10">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block font-heading text-sm tracking-[0.3em] uppercase text-queso/60 mb-3">
            Nuestra esencia
          </span>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-crema leading-tight">
            Más que una comida,{' '}
            <span className="text-queso">una experiencia</span>
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-tomato to-queso rounded-full mx-auto mt-6" />
        </div>

        {/* Carousel */}
        <div
          className="relative max-w-4xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/40 aspect-[16/10] bg-carbon-700">
            {IMAGES.map((img, i) => (
              <img
                key={img.src}
                src={img.src}
                alt={img.alt}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${
                  i === current
                    ? 'opacity-100 scale-100 z-10'
                    : 'opacity-0 scale-105 z-0'
                }`}
              />
            ))}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none z-20" />

            {/* Corner badge */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-tomato/90 backdrop-blur-sm text-white font-heading text-xs uppercase tracking-wider px-3 py-1.5 rounded-full z-20">
              🍕 Juancho&apos;s
            </div>

            {/* Bottom label */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-20">
              <span className="font-heading text-sm md:text-base text-crema/80 tracking-wider uppercase">
                {current === 0 ? 'Así se ve tu pedido' : 'Así lo preparamos'}
              </span>
            </div>

            {/* Nav arrows */}
            <button
              onClick={() => setCurrent((i) => (i - 1 + IMAGES.length) % IMAGES.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              aria-label="Anterior"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              aria-label="Siguiente"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-400 ${
                  i === current ? 'w-7 bg-queso' : 'w-2 bg-crema/20 hover:bg-crema/30'
                }`}
                aria-label={`Imagen ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Caption */}
        <p className="text-center text-crema/35 text-sm mt-10 max-w-lg mx-auto leading-relaxed">
          Del pedido a tu mesa, cada detalle cuenta. Fríe, hornea y sirve con la misma pasión con la que recibimos tu confianza.
        </p>
      </div>
    </section>
  );
}
