import { useEffect } from 'react';

const DEFAULT_TITLE = "Juancho's Pizza y Comidas Rápidas - Nemocón & Zipaquirá";
const DEFAULT_DESCRIPTION =
  "Juancho's Pizza con sedes en Nemocón y Zipaquirá. Pizzas artesanales, lasañas y spaguettis. Domicilios rápidos. Pizzería en Nemocón y Zipaquirá, Cundinamarca.";

// SPA sin SSR: cada ruta compartía el <title>/<meta description> estático de
// index.html (auditoría SEO 2026-08-21) -- Google veía el mismo snippet para
// /, /menu, /pizza, /domicilios y las 3 páginas legales. Este hook los
// actualiza en el cliente al montar cada página; se restauran los valores
// por defecto al desmontar para que la navegación de vuelta a "/" no arrastre
// el title/description de la página anterior.
//
// noIndex (SEO audit 2026-08-27): index.html trae <meta name="robots"
// content="index, follow"> global -- sin esto, la 404 (y cualquier otra
// página que no deba indexarse) heredaría ese "index, follow" y Google la
// indexaría como si fuera contenido real.
export function useDocumentMeta(title: string, description?: string, noIndex = false) {
  useEffect(() => {
    const fullTitle = `${title} | Juancho's Pizza`;
    document.title = fullTitle;

    const descTag = document.querySelector('meta[name="description"]');
    const prevDescription = descTag?.getAttribute('content') ?? null;
    if (descTag && description) {
      descTag.setAttribute('content', description);
    }

    const robotsTag = document.querySelector('meta[name="robots"]');
    const prevRobots = robotsTag?.getAttribute('content') ?? null;
    if (robotsTag && noIndex) {
      robotsTag.setAttribute('content', 'noindex, follow');
    }

    return () => {
      document.title = DEFAULT_TITLE;
      if (descTag) {
        descTag.setAttribute('content', prevDescription ?? DEFAULT_DESCRIPTION);
      }
      if (robotsTag && noIndex) {
        robotsTag.setAttribute('content', prevRobots ?? 'index, follow');
      }
    };
  }, [title, description, noIndex]);
}
