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
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    const fullTitle = `${title} | Juancho's Pizza`;
    document.title = fullTitle;

    const descTag = document.querySelector('meta[name="description"]');
    const prevDescription = descTag?.getAttribute('content') ?? null;
    if (descTag && description) {
      descTag.setAttribute('content', description);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      if (descTag) {
        descTag.setAttribute('content', prevDescription ?? DEFAULT_DESCRIPTION);
      }
    };
  }, [title, description]);
}
