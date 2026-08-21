import React from 'react';
import { SEDES, WHATSAPP_NUMBERS } from '../data/menu-data';
import { useSedeStore } from '../store/sedeStore';
import { Link } from 'react-router-dom';

const sedes = [
  { key: 'nemocon' as const, emoji: '🏡', color: 'tomato' },
  { key: 'zipaquira' as const, emoji: '🏙️', color: 'queso' },
];

const trustItems = [
  {
    icon: '⚡',
    title: 'Entrega Rápida',
    desc: 'Tu pedido llega caliente y en el menor tiempo posible.',
    gradient: 'from-tomato/20 to-tomato/5',
    iconBg: 'bg-tomato/15',
    iconShadow: 'shadow-tomato/20',
    borderColor: 'hover:border-tomato/40',
    accentLine: 'bg-tomato',
  },
  {
    icon: '💳',
    title: 'Medios de Pago',
    desc: 'Efectivo · Nequi · Daviplata · Tarjeta',
    gradient: 'from-queso/20 to-queso/5',
    iconBg: 'bg-queso/15',
    iconShadow: 'shadow-queso/20',
    borderColor: 'hover:border-queso/40',
    accentLine: 'bg-queso',
  },
  {
    icon: '🛡️',
    title: "Garantía Juancho's",
    desc: 'Si algo no está perfecto, lo arreglamos.',
    gradient: 'from-albahaca/20 to-albahaca/5',
    iconBg: 'bg-albahaca/15',
    iconShadow: 'shadow-albahaca/20',
    borderColor: 'hover:border-albahaca/40',
    accentLine: 'bg-albahaca',
  },
];

const features = [
  { emoji: '📦', label: 'Domicilios Rápidos' },
  { emoji: '🕐', label: '4:00 PM - 10:00 PM' },
  { emoji: '🚴', label: 'Domicilio según zona' },
];

const Sedes: React.FC = () => {
  const sede = useSedeStore((s) => s.sede);
  const whatsappNumber = WHATSAPP_NUMBERS[sede];
  return (
    <>
      {/* ═══════════ HERO BANNER ═══════════ */}
      <section className="relative bg-gradient-to-b from-carbon via-carbon to-crema py-10 sm:py-14 md:py-16 px-4 sm:px-8 md:px-20 overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute top-10 left-10 w-40 h-40 bg-tomato/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-56 h-56 bg-queso/8 rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-crema mb-3 sm:mb-4 drop-shadow-lg">
              Pide Sin Moverte de Casa
            </h2>
            <p className="text-crema/60 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
              Hacemos domicilio en Nemocón y Zipaquirá. Tu comida favorita llega hasta la puerta de tu casa.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
              {features.map((f, i) => (
                <span
                  key={f.label}
                  className={`feature-pill bg-crema/10 backdrop-blur-sm border border-crema/15 text-crema rounded-full px-3 sm:px-5 py-2 sm:py-2.5 inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium cursor-default ${
                    i === 0 ? 'float-anim' : i === 1 ? 'float-anim-delay' : 'float-anim-delay2'
                  }`}
                >
                  <span className="text-lg">{f.emoji}</span>
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SEDE CARDS ═══════════ */}
      <section id="domicilios" className="bg-white py-10 sm:py-14 md:py-16 px-4 sm:px-8 md:px-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {sedes.map(({ key, emoji, color }) => {
              const sede = SEDES[key];
              return (
                <div
                  key={key}
                  className={`sede-card bg-crema rounded-3xl p-5 sm:p-6 md:p-8 border-2 border-transparent ${color === 'tomato' ? 'hover:border-tomato/20' : 'hover:border-queso/20'} relative overflow-hidden`}
                >
                  {/* Decorative corner accent */}
                  <div className={`absolute top-0 right-0 w-24 h-24 ${color === 'tomato' ? 'bg-tomato/8' : 'bg-queso/8'} rounded-bl-[3rem]`} />

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="sede-emoji text-5xl">{emoji}</span>
                      <div>
                        <h3 className="font-heading text-3xl text-carbon">{sede.name}</h3>
                        <p className="text-carbon/50 text-sm">{sede.address}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-carbon/70 text-sm bg-white/60 rounded-xl px-4 py-2.5">
                        <span className="text-lg">📍</span>
                        <span>{sede.address}</span>
                      </div>
                      <a
                        href={sede.telLink}
                        className="flex items-center gap-3 text-carbon/70 text-sm bg-white/60 rounded-xl px-4 py-2.5 hover:text-tomato hover:bg-white transition-all"
                      >
                        <span className="text-lg">📞</span>
                        <span>{sede.phone}</span>
                      </a>
                      <div className="flex items-center gap-3 text-carbon/70 text-sm bg-white/60 rounded-xl px-4 py-2.5">
                        <span className="text-lg">🕐</span>
                        <span>4:00 PM - 10:00 PM</span>
                      </div>
                      <span className="inline-block bg-albahaca/15 text-albahaca text-xs font-semibold px-4 py-1.5 rounded-full border border-albahaca/20">
                        Cobertura: {sede.coverage}
                      </span>
                    </div>

                    <a
                      href={sede.phoneLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whatsapp-btn block w-full bg-green-600 text-white text-center font-heading text-lg py-3.5 rounded-2xl shadow-lg shadow-green-600/20"
                    >
                      Pedir por WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══════════ CTA STRIP ═══════════ */}
          <div className="cta-card bg-gradient-to-r from-carbon via-carbon to-horno rounded-3xl p-6 sm:p-8 md:p-10 text-center mb-8 sm:mb-12 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-4 left-8 text-4xl opacity-10">🍕</div>
            <div className="absolute bottom-4 right-8 text-4xl opacity-10">🍕</div>
            <div className="absolute top-1/2 left-4 text-2xl opacity-5">✨</div>
            <div className="absolute top-1/2 right-4 text-2xl opacity-5">✨</div>

            <div className="relative z-10">
              <h3 className="font-heading text-2xl sm:text-3xl text-crema mb-2 sm:mb-3">¿Listo para ordenar?</h3>
              <p className="text-crema/60 mb-5 sm:mb-8 text-base sm:text-lg">Haz tu pedido ahora y lo recibes en minutos.</p>
              <a
                href={`https://wa.me/${whatsappNumber}?text=Hola,%20quiero%20hacer%20un%20pedido%20🍕`}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn inline-flex items-center gap-2 sm:gap-3 bg-green-600 text-white font-heading text-base sm:text-xl px-6 sm:px-10 py-3 sm:py-4 rounded-2xl shadow-xl shadow-green-600/25"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Pedir por WhatsApp
              </a>
            </div>
          </div>

          {/* ═══════════ MAPS ═══════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {sedes.map(({ key, emoji }) => {
              const sede = SEDES[key];
              return (
                <div key={key}>
                  <h4 className="font-heading text-xl text-carbon mb-3 text-center">
                    {emoji} {sede.name}
                  </h4>
                  <div className="rounded-3xl overflow-hidden shadow-lg shadow-carbon/5 border border-carbon/5">
                    <iframe
                      src={`https://www.google.com/maps?q=${sede.mapsQuery}&output=embed`}
                      width="100%"
                      className="w-full aspect-video"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Ubicación Juancho's Pizza ${sede.name}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST ROW ═══════════ */}
      <section className="bg-gradient-to-b from-crema to-white py-10 sm:py-14 md:py-16 px-4 sm:px-8 md:px-20">
        <div className="max-w-6xl mx-auto">
          <h3 className="font-heading text-2xl sm:text-3xl md:text-4xl text-carbon text-center mb-6 sm:mb-10">
            ¿Por qué pedir con nosotros?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className={`trust-card bg-gradient-to-b ${item.gradient} border-2 border-carbon/5 ${item.borderColor} rounded-3xl p-5 sm:p-6 md:p-8 text-center cursor-default`}
              >
                {/* Accent line */}
                <div className="flex justify-center mb-5">
                  <div className={`accent-line h-1 rounded-full ${item.accentLine}`} />
                </div>

                {/* Icon */}
                <div className={`trust-icon w-20 h-20 mx-auto mb-5 ${item.iconBg} rounded-2xl flex items-center justify-center shadow-lg ${item.iconShadow}`}>
                  <span className="text-4xl">{item.icon}</span>
                </div>

                {/* Content */}
                <h3 className="font-heading text-2xl text-carbon mb-3">{item.title}</h3>
                <p className="text-carbon/60 leading-relaxed">{item.desc}</p>

                {/* Bottom decorative dots */}
                <div className="flex justify-center gap-1.5 mt-5">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.accentLine} opacity-40`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${item.accentLine} opacity-60`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${item.accentLine} opacity-40`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section className="bg-crema py-8 sm:py-10 md:py-12 text-center px-4 sm:px-8">
        <p className="text-carbon/60 text-base sm:text-lg mb-3 sm:mb-4">
          ¿Ya sabes qué vas a pedir?
        </p>
        <Link
          to="/menu"
          className="inline-block bg-tomato text-white font-heading text-lg uppercase tracking-wider px-8 py-3.5 rounded-2xl shadow-lg shadow-tomato/20 hover:bg-tomato-600 hover:shadow-xl hover:shadow-tomato/30 hover:-translate-y-1 transition-all duration-300"
        >
          Ver Menú y Ordenar →
        </Link>
      </section>
    </>
  );
};

export default Sedes;
