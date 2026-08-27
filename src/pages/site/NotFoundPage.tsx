import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

export default function NotFoundPage() {
  useDocumentMeta('Página no encontrada', undefined, { noindex: true });

  return (
    <div className="bg-crema min-h-[60vh] flex items-center justify-center px-4 py-16 text-center">
      <div>
        <span className="text-5xl block mb-4">🍕</span>
        <h1 className="font-heading text-3xl text-carbon uppercase tracking-wider mb-2">Página no encontrada</h1>
        <p className="text-carbon/60 mb-8 max-w-md mx-auto">
          El enlace que seguiste no existe o cambió de dirección. Probá desde el inicio o mirá el menú.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="bg-tomato text-white px-6 py-3 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-tomato/90 transition-colors"
          >
            Ir al inicio
          </Link>
          <Link
            to="/menu"
            className="border border-carbon/20 text-carbon px-6 py-3 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-carbon/5 transition-colors"
          >
            Ver el menú
          </Link>
        </div>
      </div>
    </div>
  );
}
