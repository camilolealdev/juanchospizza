import { useEffect, useRef, useState } from 'react';

type RechartsModule = typeof import('recharts');

/**
 * Carga diferida de recharts (chunk de ~498 KB / 125 KB gzip) con
 * granularidad fina:
 *
 *  - El import dinámico solo se dispara cuando la vista lo habilita
 *    (`enabled`) y el contenedor del gráfico se acerca al viewport
 *    (IntersectionObserver con 300 px de margen). Si el navegador no
 *    soporta IntersectionObserver o el contenedor aún no está montado
 *    (vista en estado de carga), cae a carga inmediata.
 *  - Mientras `charts` es null la vista debe renderizar un placeholder
 *    (ver ChartSkeleton); nada de recharts se descarga ni se ejecuta.
 *  - `enabled` permite vistas que muestran el gráfico condicionalmente
 *    (ej. MarketingView: sin métricas el chart ni siquiera se pinta, así
 *    que recharts nunca debe cargarse).
 *  - El chunk se excluye del precache PWA (vite.config.ts, globIgnores):
 *    el personal que nunca abre gráficos no paga esos KB.
 */
export function useLazyCharts(enabled = true) {
  const [charts, setCharts] = useState<RechartsModule | null>(null);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || charts) return;

    let active = true;
    const load = () => {
      // Si un intento previo falló y `enabled` volvió a true, reintentar.
      setError((prev) => (prev ? false : prev));
      import('recharts')
        .then((mod) => {
          if (active) setCharts(mod);
        })
        .catch((e) => {
          console.error('Error cargando recharts:', e);
          if (active) setError(true);
        });
    };

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      load();
      return () => {
        active = false;
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: '300px 0px' }
    );
    io.observe(el);

    return () => {
      active = false;
      io.disconnect();
    };
  }, [enabled, charts]);

  return { charts, error, containerRef };
}
