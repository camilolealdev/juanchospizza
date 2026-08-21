import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const CAROUSEL_IMAGES = [
  { src: '/images/experiencia-adelante.webp', alt: "Así nos ves por fuera" },
  { src: '/images/experiencia-atras.webp', alt: "Así nos encuentras" },
  { src: '/images/local.webp', alt: "Así se siente por dentro" },
];

const highlights = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
      </svg>
    ),
    title: '2 Sedes',
    desc: 'Nemocón y Zipaquirá, siempre cerca',
    iconBg: 'bg-tomato/10 group-hover:bg-tomato',
    iconText: 'text-tomato group-hover:text-white',
    cardHover: 'hover:bg-white hover:shadow-lg hover:shadow-tomato/5 hover:border-tomato/20',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    title: 'Recetas Únicas',
    desc: 'Salsas y masas preparadas artesanalmente',
    iconBg: 'bg-queso/10 group-hover:bg-queso',
    iconText: 'text-queso group-hover:text-carbon',
    cardHover: 'hover:bg-white hover:shadow-lg hover:shadow-queso/5 hover:border-queso/20',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-4.42-3.57-6-6.52-6H8.5v12h3.01c3.4 0 6.52-1.58 6.52-6z" />
      </svg>
    ),
    title: 'Delivery Rápido',
    desc: 'Domicilios en minutos por WhatsApp',
    iconBg: 'bg-albahaca/10 group-hover:bg-albahaca',
    iconText: 'text-albahaca group-hover:text-white',
    cardHover: 'hover:bg-white hover:shadow-lg hover:shadow-albahaca/5 hover:border-albahaca/20',
  },
];

export default function SobreNosotros() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setActive((i) => (i + 1) % CAROUSEL_IMAGES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(next, 3500);
    return () => clearInterval(id);
  }, [isPaused, next]);

  return (
    <section className="bg-crema overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 sm:py-20 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Image side — 3D stacked carousel */}
          <div
            className="relative"
            style={{ perspective: '1200px' }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => {
              setTimeout(() => setIsPaused(false), 3000);
            }}
          >
            {/* 3D stacked carousel cards */}
            <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden" style={{ transformStyle: 'preserve-3d' }}>
              {CAROUSEL_IMAGES.map((img, i) => {
                const offset = ((i - active + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length);
                const isActive = offset === 0;
                const isPrev = offset === CAROUSEL_IMAGES.length - 1;

                let translateZ = 0;
                let rotateY = 0;
                let translateX = 0;
                let opacity = 0;
                let scale = 1;

                if (isActive) {
                  translateZ = 30;
                  rotateY = 0;
                  translateX = 0;
                  opacity = 1;
                  scale = 1;
                } else if (isPrev) {
                  translateZ = -15;
                  rotateY = -6;
                  translateX = -10;
                  opacity = 0.6;
                  scale = 0.93;
                } else {
                  translateZ = -30;
                  rotateY = 6;
                  translateX = 10;
                  opacity = 0.3;
                  scale = 0.86;
                }

                return (
                  <div
                    key={img.src}
                    className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl shadow-carbon/20 transition-all duration-700 ease-out"
                    style={{
                      transform: `translateZ(${translateZ}px) rotateY(${rotateY}deg) translateX(${translateX}%) scale(${scale})`,
                      opacity,
                      zIndex: isActive ? 20 : isPrev ? 10 : 5,
                    }}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-carbon/60 via-carbon/10 to-transparent" />

                    {/* Label */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl inline-block">
                          <p className="font-heading text-xs tracking-[0.2em] uppercase text-tomato mb-0.5">Nuestro Espacio</p>
                          <p className="text-carbon/70 text-xs leading-relaxed">{img.alt}</p>
                        </div>
                      </div>
                    )}

                    {/* Corner badge on active */}
                    {isActive && (
                      <div className="absolute top-4 right-4 bg-tomato/90 backdrop-blur-sm text-white font-heading text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
                        🍕
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Carousel dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {CAROUSEL_IMAGES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-3 min-w-[32px] rounded-full transition-all duration-400 ${
                    i === active ? 'w-8 bg-tomato' : 'w-3 bg-carbon/15 hover:bg-carbon/25'
                  }`}
                  aria-label={`Imagen ${i + 1}`}
                  aria-current={i === active ? 'true' : undefined}
                />
              ))}
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-tomato/10 rounded-2xl -z-10 rotate-6" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-queso/10 rounded-2xl -z-10 -rotate-3" />
          </div>

          {/* Content side */}
          <div>
            <span className="inline-block font-heading text-sm tracking-[0.25em] uppercase text-tomato mb-4">
              Sobre Nosotros
            </span>
            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-carbon leading-tight mb-6">
              Más que comida,
              <br />
              <span className="text-tomato">una experiencia</span>
            </h2>
            <p className="text-carbon/60 text-base sm:text-lg leading-relaxed mb-6 sm:mb-10 max-w-lg">
              En Juancho&apos;s Pizza nació del amor por la pizza artesanal y las comidas rápidas con sabor casero.
              Cada ingrediente es seleccionado con cuidado, cada receta lleva nuestra firma.
            </p>

            {/* Highlights */}
            <div className="space-y-3 sm:space-y-5 mb-6 sm:mb-10">
              {highlights.map((h) => (
                <div
                  key={h.title}
                  className={`group flex items-center gap-5 p-4 rounded-2xl border border-crema/60 bg-white/60 transition-all duration-300 cursor-default ${h.cardHover}`}
                >
                  <span
                    className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 group-hover:scale-110 ${h.iconBg} ${h.iconText}`}
                  >
                    {h.icon}
                  </span>
                  <div>
                    <h3 className="font-heading text-lg text-carbon tracking-wider">{h.title}</h3>
                    <p className="text-carbon/50 text-sm">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-4">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-tomato text-white font-heading text-base tracking-wider uppercase rounded-xl hover:bg-tomato-600 transition-all duration-300 hover:shadow-lg hover:shadow-tomato/20 hover:scale-105"
              >
                Ver Menú
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/domicilios"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 border-2 border-carbon/15 text-carbon font-heading text-base tracking-wider uppercase rounded-xl hover:border-albahaca hover:text-albahaca transition-all duration-300"
              >
                Domicilios
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
