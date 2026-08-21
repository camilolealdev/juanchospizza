import PizzaConfigurator from '../../components/PizzaConfigurator';
import { Link } from 'react-router-dom';

export default function PizzaPage() {
  return (
    <>
      <PizzaConfigurator />

      {/* CTA to full menu */}
      <section className="bg-crema py-10 sm:py-12 md:py-14 text-center px-4">
        <p className="text-carbon/50 text-sm sm:text-base mb-3 sm:mb-4">
          ¿Prefieres algo más? También tenemos hamburguesas, pastas y más.
        </p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 bg-carbon text-queso font-heading text-sm sm:text-base uppercase tracking-wider px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl hover:bg-carbon-700 transition-all duration-300 hover:scale-105"
        >
          Ver Menú Completo
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </section>
    </>
  );
}
