import { Link } from 'react-router-dom';
import { DESTACADOS } from '../data/menu-data';

export default function Destacados() {
  const items = [...DESTACADOS, ...DESTACADOS];

  return (
    <section className="bg-crema py-24 px-4 md:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block font-heading text-sm tracking-[0.3em] uppercase text-tomato mb-3">
            Lo más pedido
          </span>
          <h2 className="font-heading text-5xl md:text-6xl lg:text-7xl text-carbon leading-none">
            Nuestros Destacados
          </h2>
          <div className="w-20 h-1 bg-tomato/80 rounded-full mx-auto mt-5" />
          <p className="text-carbon/45 text-sm mt-4 hidden md:block">
            Pasa el mouse sobre un producto para verlo en detalle
          </p>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative group/carousel">
        {/* Track */}
        <div className="flex w-max gap-6 carousel-track">
          {items.map((item, i) => (
            <Link
              key={`${item.id}-${i}`}
              to="/menu"
              className="group relative w-[280px] sm:w-[320px] md:w-[360px] flex-shrink-0 rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] carousel-card"
            >
              {/* Image */}
              <div className="relative overflow-hidden aspect-[4/3]">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = '/images/menu/pizza-1.jpg';
                  }}
                />
                {/* Default gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent transition-opacity duration-300 group-hover:opacity-0" />

                {/* Hover overlay with text */}
                <div className="absolute inset-0 bg-carbon/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-400 flex flex-col items-center justify-center p-6 text-center">
                  <h3 className="font-heading text-2xl md:text-3xl text-queso leading-tight mb-3">{item.name}</h3>
                  <p className="text-crema/70 text-sm leading-relaxed mb-4 line-clamp-3">{item.description}</p>
                  <span className="inline-flex items-center gap-2 text-xs font-heading tracking-wider uppercase text-queso/80 group-hover:text-queso transition-colors">
                    Ver en menú
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>

                {/* Name always visible at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 group-hover:opacity-0">
                  <h3 className="font-heading text-xl md:text-2xl text-white leading-tight drop-shadow-lg">
                    {item.name}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CSS for infinite carousel */}
      <style>{`
        .carousel-track {
          animation: scroll-carousel 35s linear infinite;
        }
        .group\\/carousel:hover .carousel-track {
          animation-play-state: paused;
        }
        @keyframes scroll-carousel {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
