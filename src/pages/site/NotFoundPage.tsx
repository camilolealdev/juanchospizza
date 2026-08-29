import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

export default function NotFoundPage() {
  useDocumentMeta(
    'Página no encontrada',
    "La página que buscás no existe o se movió. Volvé al inicio de Juancho's Pizza.",
    true
  );

  return (
    <section className="min-h-[70vh] flex items-center justify-center bg-crema px-4 py-16 text-center">
      <div className="max-w-lg mx-auto">
        <p className="text-6xl mb-4" aria-hidden="true">
          🍕
        </p>
        <h1 className="font-heading text-7xl sm:text-8xl text-tomato uppercase tracking-wider leading-none mb-4">
          404
        </h1>
        <p className="font-heading text-xl sm:text-2xl text-carbon uppercase tracking-wide mb-3">
          Esta página se nos cayó de las manos
        </p>
        <p className="text-carbon/60 text-base sm:text-lg mb-8">
          No encontramos lo que buscabas. Puede que el enlace esté roto o que la página se haya movido.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-queso text-carbon font-heading text-base sm:text-lg uppercase tracking-wider px-6 sm:px-8 py-3 rounded-xl hover:bg-queso-500 transition-colors"
          >
            Volver al inicio
          </Link>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 bg-transparent border-2 border-carbon/20 text-carbon font-heading text-base sm:text-lg uppercase tracking-wider px-6 sm:px-8 py-3 rounded-xl hover:border-tomato hover:text-tomato transition-colors"
          >
            Ver el menú
          </Link>
        </div>
      </div>
    </section>
  );
}
