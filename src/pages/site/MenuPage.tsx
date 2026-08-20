import MenuSection from '../../components/MenuSection';
import { Link } from 'react-router-dom';

export default function MenuPage() {
  return (
    <>
      <div className="bg-crema pt-8 pb-0 text-center px-4">
        <p className="text-carbon/50 text-sm mb-2">
          <Link to="/" className="hover:text-tomato transition-colors">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-tomato">Menú</span>
        </p>
      </div>
      <MenuSection />

      {/* CTA to pizza builder */}
      <section className="bg-carbon py-12 text-center px-4">
        <p className="text-crema/70 text-lg mb-4">¿Quieres combinar tus propios sabores?</p>
        <Link
          to="/pizza"
          className="inline-block bg-queso text-carbon font-heading text-lg uppercase tracking-wider px-8 py-3 rounded-xl hover:bg-queso-500 transition-colors"
        >
          Crea tu Pizza →
        </Link>
      </section>
    </>
  );
}
