import Hero from '../../components/Hero';
import Destacados from '../../components/Destacados';
import SobreNosotros from '../../components/SobreNosotros';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Destacados />

      {/* Quick CTA to pizza builder */}
      <section className="bg-carbon py-10 sm:py-14 md:py-16 text-center px-4">
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-queso mb-3 sm:mb-4">
          Arma tu Pizza Ideal
        </h2>
        <p className="text-crema/70 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
          Elige el tamaño, combina hasta 3 sabores y pide por WhatsApp en segundos.
        </p>
        <Link
          to="/pizza"
          className="inline-block bg-tomato text-white font-heading text-lg sm:text-xl uppercase tracking-wider px-6 sm:px-10 py-3 sm:py-4 rounded-xl hover:bg-tomato-600 transition-colors"
        >
          Crea tu Pizza →
        </Link>
      </section>

      {/* Sobre Nosotros */}
      <SobreNosotros />

      {/* Quick CTA to menu */}
      <section className="bg-crema py-10 sm:py-14 md:py-16 text-center px-4">
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-carbon mb-3 sm:mb-4">
          Explora Nuestro Menú
        </h2>
        <p className="text-carbon/60 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
          Hamburguesas, lasañas, spaguettis, salchipapas, perros calientes y más.
        </p>
        <Link
          to="/menu"
          className="inline-block bg-carbon text-queso font-heading text-lg sm:text-xl uppercase tracking-wider px-6 sm:px-10 py-3 sm:py-4 rounded-xl hover:bg-carbon-700 transition-colors"
        >
          Ver Menú Completo →
        </Link>
      </section>
    </>
  );
}
