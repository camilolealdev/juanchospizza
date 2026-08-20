import { Link } from 'react-router-dom';
import { useSedeStore } from '../store/sedeStore';
import { WHATSAPP_NUMBERS } from '../data/menu-data';

const socialLinks = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/juanchospizza1/',
    baseColor: 'text-[#E4405F]',
    hoverBg: 'hover:bg-[#E4405F]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=1238648179328878',
    baseColor: 'text-[#1877F2]',
    hoverBg: 'hover:bg-[#1877F2]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@juanchospizzanemocon',
    baseColor: 'text-crema/70',
    hoverBg: 'hover:bg-[#010101]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.39-6.22V9.41a8.16 8.16 0 0 0 4.83 1.58V7.56a4.85 4.85 0 0 1-1-.87z" />
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    href: 'https://wa.me/573108613690',
    baseColor: 'text-[#25D366]',
    hoverBg: 'hover:bg-[#25D366]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const sede = useSedeStore((s) => s.sede);
  const whatsappNumber = WHATSAPP_NUMBERS[sede];

  return (
    <footer className="bg-carbon text-crema font-body">
      {/* ── Brand hero ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-tomato/10 via-transparent to-queso/5" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-12">

          {/* Logo + Tagline — centered */}
          <div className="flex flex-col items-center text-center mb-10">
            <img
              src="/images/logo.png"
              alt="Juancho's Pizza"
              className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-cover ring-4 ring-queso/25 shadow-xl shadow-queso/10 mb-5"
              loading="lazy"
            />
            <h2 className="font-heading text-4xl md:text-5xl text-queso tracking-wider uppercase leading-none">
              Juancho&apos;s Pizza
            </h2>
            <p className="font-display text-lg md:text-xl text-crema/40 italic mt-2">
              En sabor y calidad, no hay igual
            </p>
          </div>

          {/* Social — with title */}
          <div className="text-center">
            <p className="font-heading text-sm tracking-[0.3em] uppercase text-crema/30 mb-5">
              Síguenos en nuestras redes
            </p>
            <div className="flex justify-center gap-5">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="group relative flex flex-col items-center gap-2.5"
                >
                  <span
                    className={`
                      w-14 h-14 md:w-16 md:h-16 rounded-2xl border-2 border-crema/10 bg-crema/5
                      flex items-center justify-center ${s.baseColor}
                      transition-all duration-300
                      hover:border-transparent hover:text-white hover:scale-125 hover:shadow-2xl hover:-translate-y-1
                      ${s.hoverBg}
                    `}
                  >
                    {s.icon}
                  </span>
                  <span className="text-[10px] font-heading tracking-wider uppercase text-crema/30 group-hover:text-crema/70 transition-colors">
                    {s.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Info cards — bold, colorful ── */}
      <div className="border-t border-crema/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Sedes */}
          <div className="group relative rounded-2xl border border-crema/10 bg-crema/[0.02] p-6 hover:border-tomato/40 hover:bg-tomato/[0.06] transition-all duration-300 hover:shadow-lg hover:shadow-tomato/5">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-tomato/15 flex items-center justify-center text-tomato group-hover:bg-tomato group-hover:text-white transition-all duration-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
              </span>
              <h3 className="font-heading text-lg text-queso tracking-wider uppercase">Sedes</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-crema/65">
                <span className="w-2 h-2 rounded-full bg-tomato/60 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-crema/80">Nemocón</p>
                  <p className="text-xs text-crema/40">Cundinamarca</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-crema/65">
                <span className="w-2 h-2 rounded-full bg-tomato/60 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-crema/80">Zipaquirá</p>
                  <p className="text-xs text-crema/40">Cundinamarca</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Pedidos */}
          <div className="group relative rounded-2xl border border-crema/10 bg-crema/[0.02] p-6 hover:border-albahaca/40 hover:bg-albahaca/[0.06] transition-all duration-300 hover:shadow-lg hover:shadow-albahaca/5">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-albahaca/15 flex items-center justify-center text-albahaca group-hover:bg-albahaca group-hover:text-white transition-all duration-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.24 1.01l-2.21 2.2z" />
                </svg>
              </span>
              <h3 className="font-heading text-lg text-queso tracking-wider uppercase">Pedidos</h3>
            </div>
            <ul className="space-y-3">
              <li>
                <a href="tel:+573108613690" className="flex items-center gap-3 text-sm hover:text-queso transition-colors group/link">
                  <span className="w-2 h-2 rounded-full bg-albahaca/60 flex-shrink-0" />
                  <span className="font-medium text-crema/80 group-hover/link:text-queso">310 861 3690</span>
                </a>
              </li>
              <li>
                <a href="tel:+573227699056" className="flex items-center gap-3 text-sm hover:text-queso transition-colors group/link">
                  <span className="w-2 h-2 rounded-full bg-albahaca/60 flex-shrink-0" />
                  <span className="font-medium text-crema/80 group-hover/link:text-queso">322 769 9056</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Horarios */}
          <div className="group relative rounded-2xl border border-crema/10 bg-crema/[0.02] p-6 hover:border-queso/40 hover:bg-queso/[0.06] transition-all duration-300 hover:shadow-lg hover:shadow-queso/5">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-queso/15 flex items-center justify-center text-queso group-hover:bg-queso group-hover:text-carbon transition-all duration-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </span>
              <h3 className="font-heading text-lg text-queso tracking-wider uppercase">Horarios</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-queso/60 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-crema/80">Lun - Dom</p>
                  <p className="text-xs text-crema/45">4:00 PM - 10:00 PM</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-queso/60 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-crema/80">Domicilios</p>
                  <p className="text-xs text-crema/45">5:00 PM - 9:30 PM</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── CTA banner ── */}
      <div className="border-t border-crema/10 bg-gradient-to-r from-albahaca/10 via-albahaca/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <p className="font-heading text-2xl md:text-3xl text-queso tracking-wider uppercase">
              ¿Listo para ordenar?
            </p>
            <p className="text-sm text-crema/40 mt-1">Haz tu pedido por WhatsApp en segundos</p>
          </div>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-albahaca hover:bg-albahaca-500 text-white font-heading text-lg tracking-wider uppercase rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-albahaca/30 hover:scale-105 shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
            </svg>
            Pedir por WhatsApp
          </a>
        </div>
      </div>

      {/* ── Bottom legal ── */}
      <div className="border-t border-crema/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-crema/35">
            <Link to="/politica-de-privacidad" className="hover:text-crema/70 transition-colors">Política de Privacidad</Link>
            <Link to="/terminos-y-condiciones" className="hover:text-crema/70 transition-colors">Términos y Condiciones</Link>
            <Link to="/eliminacion-de-datos" className="hover:text-crema/70 transition-colors">Eliminación de Datos</Link>
          </div>
          <p className="text-xs text-crema/25 text-center md:text-right break-words">
            &copy; 2026 Juancho&apos;s Pizza y Comidas Rápidas &mdash; Nemocón &amp; Zipaquirá
          </p>
        </div>
      </div>
    </footer>
  );
}
