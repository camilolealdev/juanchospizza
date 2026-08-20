import React from 'react';

const badges = [
  {
    icon: '⚡',
    title: 'Entrega Rápida',
    description: 'Tu pedido llega caliente y en el menor tiempo posible.',
  },
  {
    icon: '💳',
    title: 'Medios de Pago',
    description: 'Efectivo · Nequi · Daviplata · Tarjeta',
  },
  {
    icon: '🛡️',
    title: "Garantía Juancho's",
    description: 'Si algo no está perfecto, lo arreglamos.',
  },
];

const Confianza: React.FC = () => {
  return (
    <section className="bg-carbon py-12 px-4 md:px-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {badges.map((badge) => (
          <div key={badge.title} className="text-center">
            <div className="text-4xl mb-3">{badge.icon}</div>
            <h3 className="font-heading text-2xl text-queso mb-2">{badge.title}</h3>
            <p className="text-crema/70">{badge.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Confianza;
