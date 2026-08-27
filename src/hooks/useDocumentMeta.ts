import { useEffect } from 'react';

const DEFAULT_TITLE = "Juancho's Pizza y Comidas Rápidas - Nemocón & Zipaquirá";
const DEFAULT_DESCRIPTION =
  "Juancho's Pizza con sedes en Nemocón y Zipaquirá. Pizzas artesanales, lasañas y spaguettis. Domicilios rápidos. Pizzería en Nemocón y Zipaquirá, Cundinamarca.";

const CANONICAL_ORIGIN = 'https://juanchospizza.com';

// SPA sin SSR: cada ruta compartía el <title>/<meta description>/<link
// canonical> estáticos de index.html (auditoría SEO 2026-08-21/26) -- Google
// veía el mismo snippet y la misma canónica ("/") para /, /menu, /pizza,
// /domicilios y las 3 páginas legales. Este hook los actualiza en el cliente
// al montar cada página; se restauran los valores por defecto al desmontar
// para que la navegación de vuelta a "/" no arrastre los de la página
// anterior. La canónica se deriva de window.location.pathname (no de un
// parámetro) para no tener que tocar cada call site cuando se agreguen rutas.
//
// noindex: para páginas que no deberían aparecer en resultados de búsqueda
// (ej. la 404 -- devuelve status 200 en el HTML porque es una SPA sin SSR,
// así que la única señal que Google tiene para no indexarla es esta meta
// tag, no el status code de la respuesta inicial).
export function useDocumentMeta(title: string, description?: string, options?: { noindex?: boolean }) {
  const noindex = options?.noindex ?? false;

  useEffect(() => {
    const fullTitle = `${title} | Juancho's Pizza`;
    document.title = fullTitle;

    const descTag = document.querySelector('meta[name="description"]');
    const prevDescription = descTag?.getAttribute('content') ?? null;
    if (descTag && description) {
      descTag.setAttribute('content', description);
    }

    const canonicalTag = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonicalTag?.getAttribute('href') ?? null;
    if (canonicalTag) {
      canonicalTag.setAttribute('href', `${CANONICAL_ORIGIN}${window.location.pathname}`);
    }

    const robotsTag = document.querySelector('meta[name="robots"]');
    const prevRobots = robotsTag?.getAttribute('content') ?? null;
    if (robotsTag && noindex) {
      robotsTag.setAttribute('content', 'noindex, nofollow');
    }

    return () => {
      document.title = DEFAULT_TITLE;
      if (descTag) {
        descTag.setAttribute('content', prevDescription ?? DEFAULT_DESCRIPTION);
      }
      if (canonicalTag) {
        canonicalTag.setAttribute('href', prevCanonical ?? `${CANONICAL_ORIGIN}/`);
      }
      if (robotsTag) {
        robotsTag.setAttribute('content', prevRobots ?? 'index, follow');
      }
    };
  }, [title, description, noindex]);
}
