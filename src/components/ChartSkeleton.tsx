import React from 'react';

interface ChartSkeletonProps {
  height?: string;
  /** Muestra el mensaje de error de carga en lugar del placeholder. */
  error?: boolean;
}

/** Placeholder de gráfico mientras recharts carga de forma diferida. */
const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ height = 'h-72', error = false }) => {
  if (error) {
    return (
      <div
        className={`${height} w-full flex items-center justify-center text-stone-600 font-bold text-xs uppercase tracking-widest`}
      >
        No se pudo cargar el gráfico
      </div>
    );
  }
  return (
    <div className={`${height} w-full flex items-end justify-between gap-4 px-6 pb-8`} aria-hidden="true">
      {[70, 45, 85, 55, 90, 40, 75].map((h, i) => (
        <div key={i} className="flex-1 animate-pulse rounded-t-xl bg-stone-800/70" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
};

export default ChartSkeleton;
