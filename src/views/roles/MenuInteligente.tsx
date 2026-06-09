
import React, { useState } from 'react';

type Tab = 'productos' | 'variantes' | 'combos' | 'promociones' | 'menuqr';

interface ProductItem {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  popularidad: number;
  tipo: string;
  disponible: boolean;
}

interface VariantItem {
  id: string;
  producto: string;
  tamano: string;
  precioMod: number;
  activo: boolean;
}

interface ComboItem {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  ahorro: number;
  items: string[];
  color: string;
}

interface PromoItem {
  id: string;
  nombre: string;
  tipo: string;
  valor: string;
  inicia: string;
  termina: string;
  usado: number;
  limite: number;
  activo: boolean;
}

const PRODUCTOS: ProductItem[] = [
  { id: 'p1', nombre: 'Pizza Especial', categoria: 'Pizza Tradicional', precio: 28900, popularidad: 5, tipo: 'bg-orange-600', disponible: true },
  { id: 'p2', nombre: 'Lasaña Mixta', categoria: 'Pasta', precio: 23900, popularidad: 4, tipo: 'bg-amber-600', disponible: true },
  { id: 'p3', nombre: 'Hamburguesa Clásica', categoria: 'Americano', precio: 19900, popularidad: 5, tipo: 'bg-red-600', disponible: true },
  { id: 'p4', nombre: 'Perro Caliente', categoria: 'Americano', precio: 15900, popularidad: 3, tipo: 'bg-red-700', disponible: false },
  { id: 'p5', nombre: 'Alitas BBQ', categoria: 'Entrada', precio: 18900, popularidad: 4, tipo: 'bg-yellow-700', disponible: true },
  { id: 'p6', nombre: 'Spaghetti Carbonara', categoria: 'Pasta', precio: 26900, popularidad: 4, tipo: 'bg-amber-700', disponible: true },
  { id: 'p7', nombre: 'Sándwich Cubano', categoria: 'Americano', precio: 17900, popularidad: 3, tipo: 'bg-stone-700', disponible: true },
  { id: 'p8', nombre: 'Papas Francesas', categoria: 'Entrada', precio: 8900, popularidad: 5, tipo: 'bg-yellow-600', disponible: true },
];

const VARIANTES: VariantItem[] = [
  { id: 'v1', producto: 'Pizza Especial', tamano: 'Personal', precioMod: 0, activo: true },
  { id: 'v2', producto: 'Pizza Especial', tamano: 'Mediana', precioMod: 8900, activo: true },
  { id: 'v3', producto: 'Pizza Especial', tamano: 'Grande', precioMod: 14900, activo: true },
  { id: 'v4', producto: 'Lasaña Mixta', tamano: 'Personal', precioMod: 0, activo: true },
  { id: 'v5', producto: 'Lasaña Mixta', tamano: 'Mediana', precioMod: 7000, activo: true },
  { id: 'v6', producto: 'Lasaña Mixta', tamano: 'Grande', precioMod: 12000, activo: false },
  { id: 'v7', producto: 'Hamburguesa Clásica', tamano: 'Sencilla', precioMod: 0, activo: true },
  { id: 'v8', producto: 'Hamburguesa Clásica', tamano: 'Doble', precioMod: 6000, activo: true },
  { id: 'v9', producto: 'Alitas BBQ', tamano: '6 unidades', precioMod: 0, activo: true },
  { id: 'v10', producto: 'Alitas BBQ', tamano: '12 unidades', precioMod: 7000, activo: true },
];

const COMBOS: ComboItem[] = [
  {
    id: 'co1',
    nombre: 'Combo Familiar',
    descripcion: '2 pizzas medianas + gaseosa 1.5L',
    precio: 89900,
    ahorro: 18500,
    items: ['Pizza Mediana Tradicional x2', 'Gaseosa 1.5L', 'Porción de queso extra'],
    color: 'from-orange-900/40 to-orange-950/20',
  },
  {
    id: 'co2',
    nombre: 'Combo Pareja',
    descripcion: '1 pizza + 1 lasaña + bebida 500ml',
    precio: 55900,
    ahorro: 10900,
    items: ['Pizza Personal', 'Lasaña Mixta Personal', 'Bebida 500ml'],
    color: 'from-pink-900/30 to-pink-950/10',
  },
  {
    id: 'co3',
    nombre: 'Combo Infantil',
    descripcion: 'Mini pizza + jugo natural + postre',
    precio: 32900,
    ahorro: 7500,
    items: ['Mini Pizza Personal', 'Jugo Natural', 'Postre Artesanal'],
    color: 'from-sky-900/30 to-sky-950/10',
  },
];

const PROMOCIONES: PromoItem[] = [
  { id: 'pr1', nombre: 'Martes de Descuento', tipo: 'Porcentaje', valor: '25% OFF', inicia: '01/06/2026', termina: '30/06/2026', usado: 142, limite: 300, activo: true },
  { id: 'pr2', nombre: 'Combo Flash 2x1', tipo: 'Compre y Lleve', valor: '2x1 en Combos', inicia: '05/06/2026', termina: '12/06/2026', usado: 67, limite: 100, activo: true },
  { id: 'pr3', nombre: 'Envío Gratis', tipo: 'Fijo', valor: '$0 Delivery', inicia: '01/06/2026', termina: '15/06/2026', usado: 210, limite: 500, activo: false },
];

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'productos', label: 'Productos', icon: 'fa-pizza-slice' },
  { key: 'variantes', label: 'Variantes', icon: 'fa-ruler-combined' },
  { key: 'combos', label: 'Combos', icon: 'fa-box-open' },
  { key: 'promociones', label: 'Promociones', icon: 'fa-tag' },
  { key: 'menuqr', label: 'Menú QR', icon: 'fa-qrcode' },
];

const MenuInteligente: React.FC = () => {
  const [tab, setTab] = useState<Tab>('productos');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [disponibles, setDisponibles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PRODUCTOS.map(p => [p.id, p.disponible]))
  );
  const [activos, setActivos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PROMOCIONES.map(p => [p.id, p.activo]))
  );
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const formatPrice = (price: number) =>
    '$' + price.toLocaleString('es-CO');

  const renderStars = (n: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <i key={i} className={`fas fa-star text-[10px] ${i < n ? 'text-orange-500' : 'text-stone-700'}`}></i>
    ));

  return (
    <div className="p-8 md:p-12 space-y-10 pb-40 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-brand">Menú Inteligente</h1>
          <p className="text-stone-500 text-sm md:text-base max-w-xl">Gestión de productos, variantes y promociones</p>
        </div>
        <button onClick={() => showToast('Formulario de nuevo producto abierto')} className="w-full md:w-auto flex items-center justify-center gap-4 bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95">
          <i className="fas fa-plus"></i> NUEVO PRODUCTO
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/30'
                : 'bg-stone-900/60 text-stone-500 border border-white/5 hover:border-orange-500/30 hover:text-stone-300'
            }`}
          >
            <i className={`fas ${t.icon}`}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Productos */}
      {tab === 'productos' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {PRODUCTOS.map(p => (
            <div key={p.id} className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-orange-500/40 transition-all shadow-xl">
              <div className={`relative aspect-[4/3] ${p.tipo} flex items-center justify-center overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <i className="fas fa-image text-white/20 text-6xl"></i>
                <span className="absolute bottom-4 left-5 text-[9px] font-black uppercase tracking-[0.3em] bg-black/60 px-4 py-2 rounded-full border border-white/10 text-stone-300">
                  {p.categoria}
                </span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-lg text-white">{p.nombre}</h3>
                  <span className="text-orange-500 font-black text-lg">{formatPrice(p.precio)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {renderStars(p.popularidad)}
                  <span className="text-[9px] text-stone-600 font-bold uppercase tracking-wider">({p.popularidad}.0)</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Disponibilidad</span>
                  <button
                    onClick={() => setDisponibles(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                    className={`relative w-12 h-6 rounded-full transition-all ${
                      disponibles[p.id] ? 'bg-orange-600' : 'bg-stone-800'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      disponibles[p.id] ? 'left-6' : 'left-0.5'
                    }`}></div>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Variantes */}
      {tab === 'variantes' && (
        <div className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-xl">
          <div className="p-8 border-b border-white/5">
            <h3 className="font-black text-sm uppercase tracking-widest text-stone-300">
              <i className="fas fa-ruler-combined text-orange-500 mr-4"></i>
              Opciones de Tamaño y Variantes
            </h3>
          </div>
          {Array.from(new Set(VARIANTES.map(v => v.producto))).map(producto => {
            const variantes = VARIANTES.filter(v => v.producto === producto);
            const isExpanded = expanded === producto;

            return (
              <div key={producto} className="border-b border-white/5 last:border-0">
                <button
                  onClick={() => setExpanded(isExpanded ? null : producto)}
                  className="w-full flex items-center justify-between px-8 py-6 hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl bg-stone-950 flex items-center justify-center transition-all ${isExpanded ? 'text-orange-500' : 'text-stone-600'}`}>
                      <i className={`fas fa-chevron-right text-xs transition-all ${isExpanded ? 'rotate-90' : ''}`}></i>
                    </div>
                    <span className="font-black text-base text-white">{producto}</span>
                    <span className="text-[9px] text-stone-600 font-bold uppercase tracking-wider bg-stone-950 px-3 py-1 rounded-full border border-white/5">
                      {variantes.length} variantes
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-8 pb-6 space-y-3">
                    {variantes.map(v => (
                      <div key={v.id} className="flex items-center justify-between bg-stone-950/50 px-6 py-4 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${v.activo ? 'bg-green-500' : 'bg-stone-700'}`}></div>
                          <span className="font-bold text-stone-300">{v.tamano}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={`font-black ${v.precioMod === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                            {v.precioMod === 0 ? 'Incluido' : `+${formatPrice(v.precioMod)}`}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                            v.activo
                              ? 'text-green-500 border-green-500/20 bg-green-950/30'
                              : 'text-stone-600 border-stone-700 bg-stone-800/30'
                          }`}>
                            {v.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: Combos */}
      {tab === 'combos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {COMBOS.map(c => (
            <div key={c.id} className={`bg-gradient-to-br ${c.color} bg-stone-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-orange-500/30 transition-all shadow-xl relative`}>
              <div className="absolute top-5 right-5 bg-orange-600 text-white text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-xl">
                Ahorra {formatPrice(c.ahorro)}
              </div>
              <div className="p-8 pt-16 space-y-6">
                <h3 className="font-black text-2xl text-white">{c.nombre}</h3>
                <p className="text-stone-400 text-sm">{c.descripcion}</p>

                <div className="space-y-3 border-t border-white/5 pt-6">
                  <p className="text-[9px] font-black text-stone-600 uppercase tracking-widest">Incluye:</p>
                  {c.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <i className="fas fa-check-circle text-orange-500 text-xs"></i>
                      <span className="text-stone-300 text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-stone-500 text-[10px] line-through font-black">{formatPrice(c.precio + c.ahorro)}</span>
                  <span className="text-orange-500 font-black text-3xl">{formatPrice(c.precio)}</span>
                </div>

                <button onClick={() => showToast(`Combo "${c.nombre}" activado`)} className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95">
                  <i className="fas fa-cart-plus mr-3"></i>
                  Activar Combo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Promociones */}
      {tab === 'promociones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PROMOCIONES.map(p => (
            <div key={p.id} className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 p-8 group hover:border-orange-500/30 transition-all shadow-xl space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="font-black text-xl text-white">{p.nombre}</h3>
                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-4 py-2 rounded-full border ${
                    p.tipo === 'Porcentaje'
                      ? 'text-purple-400 border-purple-500/20 bg-purple-950/30'
                      : p.tipo === 'Compre y Lleve'
                      ? 'text-cyan-400 border-cyan-500/20 bg-cyan-950/30'
                      : 'text-orange-400 border-orange-500/20 bg-orange-950/30'
                  }`}>
                    {p.tipo}
                  </span>
                </div>
                <div className={`text-2xl font-black ${
                  p.tipo === 'Porcentaje' ? 'text-purple-500' : p.tipo === 'Compre y Lleve' ? 'text-cyan-500' : 'text-orange-500'
                }`}>
                  {p.valor}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-stone-950/50 rounded-2xl p-4 border border-white/5">
                  <p className="text-[8px] font-black text-stone-600 uppercase tracking-widest mb-1">Inicia</p>
                  <p className="font-bold text-sm text-stone-300">{p.inicia}</p>
                </div>
                <div className="bg-stone-950/50 rounded-2xl p-4 border border-white/5">
                  <p className="text-[8px] font-black text-stone-600 uppercase tracking-widest mb-1">Termina</p>
                  <p className="font-bold text-sm text-stone-300">{p.termina}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-stone-500 uppercase tracking-widest">
                  <span>Usos: {p.usado}/{p.limite}</span>
                  <span>{Math.round((p.usado / p.limite) * 100)}%</span>
                </div>
                <div className="h-2 bg-stone-950 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-orange-800 to-orange-500 rounded-full transition-all"
                    style={{ width: `${(p.usado / p.limite) * 100}%` }}>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Promoción Activa</span>
                <button
                  onClick={() => setActivos(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    activos[p.id] ? 'bg-orange-600' : 'bg-stone-800'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    activos[p.id] ? 'left-6' : 'left-0.5'
                  }`}></div>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Menú QR */}
      {tab === 'menuqr' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 p-10 md:p-14 flex flex-col items-center justify-center shadow-xl">
            <div className="relative mb-8">
              <div className="w-56 h-56 bg-white rounded-3xl p-5 flex items-center justify-center shadow-2xl">
                <div className="w-full h-full relative">
                  {/* Mock QR pattern */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-black rounded-lg"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-4 border-black rounded-lg"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-4 border-black rounded-lg"></div>
                  <div className="absolute top-[18px] left-[18px] w-6 h-6 bg-black rounded"></div>
                  <div className="absolute top-[18px] right-[18px] w-6 h-6 bg-black rounded"></div>
                  <div className="absolute bottom-[18px] left-[18px] w-6 h-6 bg-black rounded"></div>
                  {/* Inner pattern */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid grid-cols-5 gap-1.5">
                      {Array.from({ length: 25 }, (_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-sm ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`}></div>
                      ))}
                    </div>
                  </div>
                  {/* Center Guido circle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full border-4 border-black flex items-center justify-center">
                    <span className="font-black text-[8px] text-black text-center leading-tight tracking-tighter">GUIDO</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-[8px] font-black uppercase tracking-widest px-5 py-2 rounded-full whitespace-nowrap">
                Escanea y Pide
              </div>
            </div>
            <p className="text-stone-400 text-center font-bold text-sm">Escanea para ver el menú digital</p>
          </div>

          <div className="space-y-6 flex flex-col justify-center">
            <div className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 p-8 shadow-xl space-y-6">
              <div className="space-y-2">
                <h3 className="font-black text-xl text-white">Menú Digital QR</h3>
                <p className="text-stone-500 text-sm">Comparte el menú con tus clientes al instante. Sin contacto, sin esperas.</p>
              </div>

              <div className="space-y-4">
                <button onClick={() => window.open('https://wa.me/?text=¡Mira nuestro menú digital!', '_blank')} className="w-full flex items-center justify-between bg-stone-950/60 hover:bg-stone-950 px-8 py-6 rounded-[2rem] border border-white/5 group transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-green-600/20 flex items-center justify-center text-green-500">
                      <i className="fab fa-whatsapp text-xl"></i>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm text-white group-hover:text-orange-500 transition-colors">Compartir en WhatsApp</p>
                      <p className="text-[9px] text-stone-600 font-bold uppercase tracking-wider">Enviar a clientes</p>
                    </div>
                  </div>
                  <i className="fas fa-arrow-right text-stone-600 group-hover:text-orange-500 transition-all"></i>
                </button>

                <button onClick={() => showToast('Generando PDF del menú...')} className="w-full flex items-center justify-between bg-stone-950/60 hover:bg-stone-950 px-8 py-6 rounded-[2rem] border border-white/5 group transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-600/20 flex items-center justify-center text-orange-500">
                      <i className="fas fa-file-pdf text-xl"></i>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm text-white group-hover:text-orange-500 transition-colors">Descargar PDF</p>
                      <p className="text-[9px] text-stone-600 font-bold uppercase tracking-wider">Versión imprimible</p>
                    </div>
                  </div>
                  <i className="fas fa-arrow-right text-stone-600 group-hover:text-orange-500 transition-all"></i>
                </button>

                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/menu'); showToast('Enlace copiado al portapapeles'); }} className="w-full flex items-center justify-between bg-stone-950/60 hover:bg-stone-950 px-8 py-6 rounded-[2rem] border border-white/5 group transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-500">
                      <i className="fas fa-link text-xl"></i>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm text-white group-hover:text-orange-500 transition-colors">Copiar Enlace</p>
                      <p className="text-[9px] text-stone-600 font-bold uppercase tracking-wider">Enlace directo al menú</p>
                    </div>
                  </div>
                  <i className="fas fa-arrow-right text-stone-600 group-hover:text-orange-500 transition-all"></i>
                </button>
              </div>

              <div className="bg-stone-950/30 p-6 rounded-[2rem] border border-white/5 flex items-center gap-4">
                <i className="fas fa-info-circle text-orange-500 text-lg"></i>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider leading-relaxed">
                  El menú QR se actualiza automáticamente con cada cambio en productos, variantes y promociones.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-orange-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
};

export default MenuInteligente;
