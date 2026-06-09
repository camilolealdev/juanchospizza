
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

type ModalMode = 'add' | 'edit';

const CATEGORIES = ['Pizza Tradicional', 'Pasta', 'Americano', 'Entrada', 'Postre', 'Bebida'];
const TIPO_COLORS: Record<string, string> = {
  'Pizza Tradicional': 'bg-orange-600',
  'Pasta': 'bg-amber-600',
  'Americano': 'bg-red-600',
  'Entrada': 'bg-yellow-700',
  'Postre': 'bg-pink-700',
  'Bebida': 'bg-blue-700',
};
const PROMO_TIPOS = ['Porcentaje', 'Compre y Lleve', 'Fijo'];

const INITIAL_PRODUCTOS: ProductItem[] = [
  { id: 'p1', nombre: 'Pizza Especial', categoria: 'Pizza Tradicional', precio: 28900, popularidad: 5, tipo: 'bg-orange-600', disponible: true },
  { id: 'p2', nombre: 'Lasaña Mixta', categoria: 'Pasta', precio: 23900, popularidad: 4, tipo: 'bg-amber-600', disponible: true },
  { id: 'p3', nombre: 'Hamburguesa Clásica', categoria: 'Americano', precio: 19900, popularidad: 5, tipo: 'bg-red-600', disponible: true },
  { id: 'p4', nombre: 'Perro Caliente', categoria: 'Americano', precio: 15900, popularidad: 3, tipo: 'bg-red-700', disponible: false },
  { id: 'p5', nombre: 'Alitas BBQ', categoria: 'Entrada', precio: 18900, popularidad: 4, tipo: 'bg-yellow-700', disponible: true },
  { id: 'p6', nombre: 'Spaghetti Carbonara', categoria: 'Pasta', precio: 26900, popularidad: 4, tipo: 'bg-amber-700', disponible: true },
  { id: 'p7', nombre: 'Sándwich Cubano', categoria: 'Americano', precio: 17900, popularidad: 3, tipo: 'bg-stone-700', disponible: true },
  { id: 'p8', nombre: 'Papas Francesas', categoria: 'Entrada', precio: 8900, popularidad: 5, tipo: 'bg-yellow-600', disponible: true },
];

const INITIAL_VARIANTES: VariantItem[] = [
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

const INITIAL_COMBOS: ComboItem[] = [
  { id: 'co1', nombre: 'Combo Familiar', descripcion: '2 pizzas medianas + gaseosa 1.5L', precio: 89900, ahorro: 18500, items: ['Pizza Mediana Tradicional x2', 'Gaseosa 1.5L', 'Porción de queso extra'], color: 'from-orange-900/40 to-orange-950/20' },
  { id: 'co2', nombre: 'Combo Pareja', descripcion: '1 pizza + 1 lasaña + bebida 500ml', precio: 55900, ahorro: 10900, items: ['Pizza Personal', 'Lasaña Mixta Personal', 'Bebida 500ml'], color: 'from-pink-900/30 to-pink-950/10' },
  { id: 'co3', nombre: 'Combo Infantil', descripcion: 'Mini pizza + jugo natural + postre', precio: 32900, ahorro: 7500, items: ['Mini Pizza Personal', 'Jugo Natural', 'Postre Artesanal'], color: 'from-sky-900/30 to-sky-950/10' },
];

const INITIAL_PROMOCIONES: PromoItem[] = [
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

let nextEntityId = 100;

const genId = (prefix: string) => `${prefix}${nextEntityId++}`;

const formatPrice = (price: number) => '$' + price.toLocaleString('es-CO');

const renderStars = (n: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <i key={i} className={`fas fa-star text-[10px] ${i < n ? 'text-orange-500' : 'text-stone-700'}`}></i>
  ));

/* ─── Modal ─── */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-stone-950 border border-white/10 rounded-[2.5rem] shadow-2xl animate-zoom-in overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-white/5">
          <h3 className="font-black text-lg text-white uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-stone-500 hover:text-white hover:bg-stone-800 transition-all">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-8 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

/* ─── Confirm Dialog ─── */
const ConfirmDialog: React.FC<{ open: boolean; message: string; onConfirm: () => void; onCancel: () => void }> = ({ open, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="w-full max-w-sm bg-stone-950 border border-white/10 rounded-[2rem] p-8 shadow-2xl animate-zoom-in text-center" onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-2xl bg-red-600/20 flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-trash text-red-500 text-xl"></i>
        </div>
        <p className="text-stone-300 font-bold text-sm mb-8">{message}</p>
        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-4 rounded-[1.5rem] bg-stone-900 text-stone-400 font-black text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-all">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-4 rounded-[1.5rem] bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all">Eliminar</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Empty State ─── */
const EmptyState: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 text-stone-600">
    <i className={`fas ${icon} text-5xl mb-6 opacity-30`}></i>
    <p className="font-bold text-sm uppercase tracking-widest">{text}</p>
  </div>
);

const MenuInteligente: React.FC = () => {
  const [tab, setTab] = useState<Tab>('productos');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  /* Data state */
  const [productos, setProductos] = useState<ProductItem[]>(INITIAL_PRODUCTOS);
  const [variantes, setVariantes] = useState<VariantItem[]>(INITIAL_VARIANTES);
  const [combos, setCombos] = useState<ComboItem[]>(INITIAL_COMBOS);
  const [promociones, setPromociones] = useState<PromoItem[]>(INITIAL_PROMOCIONES);

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [modalEntity, setModalEntity] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  /* ── Product form ── */
  const [pf, setPf] = useState({ nombre: '', categoria: CATEGORIES[0], precio: 0, popularidad: 3, disponible: true });
  const [editProductId, setEditProductId] = useState<string | null>(null);

  /* ── Variant form ── */
  const [vf, setVf] = useState({ producto: '', tamano: '', precioMod: 0, activo: true });
  const [editVariantId, setEditVariantId] = useState<string | null>(null);

  /* ── Combo form ── */
  const [cf, setCf] = useState({ nombre: '', descripcion: '', precio: 0, ahorro: 0, itemsText: '', color: 'from-orange-900/40 to-orange-950/20' });
  const [editComboId, setEditComboId] = useState<string | null>(null);

  /* ── Promo form ── */
  const [promoF, setPromoF] = useState({ nombre: '', tipo: PROMO_TIPOS[0], valor: '', inicia: '', termina: '', usado: 0, limite: 100, activo: true });
  const [editPromoId, setEditPromoId] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  /* ── Product CRUD ── */
  const openAddProduct = () => {
    setModalMode('add');
    setModalEntity('producto');
    setPf({ nombre: '', categoria: CATEGORIES[0], precio: 0, popularidad: 3, disponible: true });
    setEditProductId(null);
    setModalOpen(true);
  };
  const openEditProduct = (p: ProductItem) => {
    setModalMode('edit');
    setModalEntity('producto');
    setPf({ nombre: p.nombre, categoria: p.categoria, precio: p.precio, popularidad: p.popularidad, disponible: p.disponible });
    setEditProductId(p.id);
    setModalOpen(true);
  };
  const saveProduct = () => {
    if (!pf.nombre.trim() || pf.precio <= 0) { showToast('Completa nombre y precio'); return; }
    if (modalMode === 'add') {
      const nuevo: ProductItem = {
        id: genId('p'),
        nombre: pf.nombre,
        categoria: pf.categoria,
        precio: pf.precio,
        popularidad: pf.popularidad,
        tipo: TIPO_COLORS[pf.categoria] || 'bg-stone-600',
        disponible: pf.disponible,
      };
      setProductos(prev => [...prev, nuevo]);
      showToast(`"${nuevo.nombre}" creado`);
    } else {
      setProductos(prev => prev.map(p => p.id === editProductId ? { ...p, nombre: pf.nombre, categoria: pf.categoria, precio: pf.precio, popularidad: pf.popularidad, tipo: TIPO_COLORS[pf.categoria] || 'bg-stone-600', disponible: pf.disponible } : p));
      showToast('Producto actualizado');
    }
    setModalOpen(false);
  };
  const deleteProduct = (id: string) => {
    setConfirmAction(() => () => {
      setProductos(prev => prev.filter(p => p.id !== id));
      showToast('Producto eliminado');
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  /* ── Variant CRUD ── */
  const openAddVariant = () => {
    setModalMode('add');
    setModalEntity('variante');
    setVf({ producto: productos[0]?.nombre || '', tamano: '', precioMod: 0, activo: true });
    setEditVariantId(null);
    setModalOpen(true);
  };
  const openEditVariant = (v: VariantItem) => {
    setModalMode('edit');
    setModalEntity('variante');
    setVf({ producto: v.producto, tamano: v.tamano, precioMod: v.precioMod, activo: v.activo });
    setEditVariantId(v.id);
    setModalOpen(true);
  };
  const saveVariant = () => {
    if (!vf.producto || !vf.tamano.trim()) { showToast('Completa todos los campos'); return; }
    if (modalMode === 'add') {
      const nuevo: VariantItem = { id: genId('v'), ...vf };
      setVariantes(prev => [...prev, nuevo]);
      showToast(`Variante "${vf.tamano}" creada`);
    } else {
      setVariantes(prev => prev.map(v => v.id === editVariantId ? { ...v, ...vf } : v));
      showToast('Variante actualizada');
    }
    setModalOpen(false);
  };
  const deleteVariant = (id: string) => {
    setConfirmAction(() => () => {
      setVariantes(prev => prev.filter(v => v.id !== id));
      showToast('Variante eliminada');
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };
  const toggleVariant = (id: string) => {
    setVariantes(prev => prev.map(v => v.id === id ? { ...v, activo: !v.activo } : v));
  };

  /* ── Combo CRUD ── */
  const openAddCombo = () => {
    setModalMode('add');
    setModalEntity('combo');
    setCf({ nombre: '', descripcion: '', precio: 0, ahorro: 0, itemsText: '', color: 'from-orange-900/40 to-orange-950/20' });
    setEditComboId(null);
    setModalOpen(true);
  };
  const openEditCombo = (c: ComboItem) => {
    setModalMode('edit');
    setModalEntity('combo');
    setCf({ nombre: c.nombre, descripcion: c.descripcion, precio: c.precio, ahorro: c.ahorro, itemsText: c.items.join(', '), color: c.color });
    setEditComboId(c.id);
    setModalOpen(true);
  };
  const saveCombo = () => {
    if (!cf.nombre.trim() || cf.precio <= 0) { showToast('Completa nombre y precio'); return; }
    const items = cf.itemsText.split(',').map(s => s.trim()).filter(Boolean);
    if (items.length === 0) { showToast('Agrega al menos un item'); return; }
    if (modalMode === 'add') {
      const nuevo: ComboItem = { id: genId('co'), ...cf, items };
      setCombos(prev => [...prev, nuevo]);
      showToast(`Combo "${cf.nombre}" creado`);
    } else {
      setCombos(prev => prev.map(c => c.id === editComboId ? { ...c, nombre: cf.nombre, descripcion: cf.descripcion, precio: cf.precio, ahorro: cf.ahorro, items, color: cf.color } : c));
      showToast('Combo actualizado');
    }
    setModalOpen(false);
  };
  const deleteCombo = (id: string) => {
    setConfirmAction(() => () => {
      setCombos(prev => prev.filter(c => c.id !== id));
      showToast('Combo eliminado');
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  /* ── Promo CRUD ── */
  const openAddPromo = () => {
    setModalMode('add');
    setModalEntity('promocion');
    setPromoF({ nombre: '', tipo: PROMO_TIPOS[0], valor: '', inicia: '', termina: '', usado: 0, limite: 100, activo: true });
    setEditPromoId(null);
    setModalOpen(true);
  };
  const openEditPromo = (p: PromoItem) => {
    setModalMode('edit');
    setModalEntity('promocion');
    setPromoF({ nombre: p.nombre, tipo: p.tipo, valor: p.valor, inicia: p.inicia, termina: p.termina, usado: p.usado, limite: p.limite, activo: p.activo });
    setEditPromoId(p.id);
    setModalOpen(true);
  };
  const savePromo = () => {
    if (!promoF.nombre.trim() || !promoF.valor.trim()) { showToast('Completa nombre y valor'); return; }
    if (modalMode === 'add') {
      const nuevo: PromoItem = { id: genId('pr'), ...promoF };
      setPromociones(prev => [...prev, nuevo]);
      showToast(`Promo "${promoF.nombre}" creada`);
    } else {
      setPromociones(prev => prev.map(p => p.id === editPromoId ? { ...p, ...promoF } : p));
      showToast('Promoción actualizada');
    }
    setModalOpen(false);
  };
  const deletePromo = (id: string) => {
    setConfirmAction(() => () => {
      setPromociones(prev => prev.filter(p => p.id !== id));
      showToast('Promoción eliminada');
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };
  const togglePromo = (id: string) => {
    setPromociones(prev => prev.map(p => p.id === id ? { ...p, activo: !p.activo } : p));
  };

  /* ── Modal body ── */
  const renderModalBody = () => {
    if (modalEntity === 'producto') {
      return (
        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Nombre del Producto</label>
            <input value={pf.nombre} onChange={e => setPf(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Pizza de Pepperoni" className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Categoría</label>
            <select value={pf.categoria} onChange={e => setPf(p => ({ ...p, categoria: e.target.value }))} className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Precio ($)</label>
            <input type="number" value={pf.precio || ''} onChange={e => setPf(p => ({ ...p, precio: parseInt(e.target.value) || 0 }))} className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Popularidad (1-5)</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setPf(p => ({ ...p, popularidad: n }))} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${n <= pf.popularidad ? 'bg-orange-600 text-white' : 'bg-stone-900 text-stone-600 border border-white/5'}`}>
                  <i className="fas fa-star text-sm"></i>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Disponible</label>
            <button onClick={() => setPf(p => ({ ...p, disponible: !p.disponible }))} className={`relative w-12 h-6 rounded-full transition-all ${pf.disponible ? 'bg-orange-600' : 'bg-stone-800'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${pf.disponible ? 'left-6' : 'left-0.5'}`}></div>
            </button>
          </div>
          <button onClick={saveProduct} className="w-full mt-6 bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl">
            {modalMode === 'add' ? 'Crear Producto' : 'Guardar Cambios'}
          </button>
        </div>
      );
    }
    if (modalEntity === 'variante') {
      return (
        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Producto</label>
            <select value={vf.producto} onChange={e => setVf(v => ({ ...v, producto: e.target.value }))} className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors">
              {productos.filter(p => p.disponible).map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Tamaño / Variante</label>
            <input value={vf.tamano} onChange={e => setVf(v => ({ ...v, tamano: e.target.value }))} placeholder="Ej: Grande, 12 unidades, Doble" className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Recargo ($) — 0 si es precio base</label>
            <input type="number" value={vf.precioMod || ''} onChange={e => setVf(v => ({ ...v, precioMod: parseInt(e.target.value) || 0 }))} className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Activo</label>
            <button onClick={() => setVf(v => ({ ...v, activo: !v.activo }))} className={`relative w-12 h-6 rounded-full transition-all ${vf.activo ? 'bg-orange-600' : 'bg-stone-800'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${vf.activo ? 'left-6' : 'left-0.5'}`}></div>
            </button>
          </div>
          <button onClick={saveVariant} className="w-full mt-6 bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl">
            {modalMode === 'add' ? 'Crear Variante' : 'Guardar Cambios'}
          </button>
        </div>
      );
    }
    if (modalEntity === 'combo') {
      return (
        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Nombre del Combo</label>
            <input value={cf.nombre} onChange={e => setCf(c => ({ ...c, nombre: e.target.value }))} placeholder="Ej: Combo Mega" className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Descripción</label>
            <input value={cf.descripcion} onChange={e => setCf(c => ({ ...c, descripcion: e.target.value }))} placeholder="Ej: 2 pizzas + gaseosa" className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Precio ($)</label>
              <input type="number" value={cf.precio || ''} onChange={e => setCf(c => ({ ...c, precio: parseInt(e.target.value) || 0 }))} className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Ahorro ($)</label>
              <input type="number" value={cf.ahorro || ''} onChange={e => setCf(c => ({ ...c, ahorro: parseInt(e.target.value) || 0 }))} className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Items (separados por coma)</label>
            <textarea value={cf.itemsText} onChange={e => setCf(c => ({ ...c, itemsText: e.target.value }))} placeholder="Ej: Pizza Personal, Gaseosa 1.5L, Postre" rows={3} className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors resize-none" />
            {cf.itemsText && (
              <div className="flex flex-wrap gap-2 mt-3">
                {cf.itemsText.split(',').map((item, i) => item.trim() && <span key={i} className="text-[9px] font-black text-orange-500 uppercase tracking-wider bg-orange-950/30 px-3 py-1 rounded-full border border-orange-500/20">{item.trim()}</span>)}
              </div>
            )}
          </div>
          <button onClick={saveCombo} className="w-full mt-6 bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl">
            {modalMode === 'add' ? 'Crear Combo' : 'Guardar Cambios'}
          </button>
        </div>
      );
    }
    if (modalEntity === 'promocion') {
      return (
        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Nombre</label>
            <input value={promoF.nombre} onChange={e => setPromoF(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Cyber Monday" className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Tipo</label>
            <select value={promoF.tipo} onChange={e => setPromoF(p => ({ ...p, tipo: e.target.value }))} className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors">
              {PROMO_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Valor</label>
            <input value={promoF.valor} onChange={e => setPromoF(p => ({ ...p, valor: e.target.value }))} placeholder="Ej: 30% OFF, 2x1, $0 Delivery" className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Inicia</label>
              <input value={promoF.inicia} onChange={e => setPromoF(p => ({ ...p, inicia: e.target.value }))} placeholder="01/06/2026" className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Termina</label>
              <input value={promoF.termina} onChange={e => setPromoF(p => ({ ...p, termina: e.target.value }))} placeholder="30/06/2026" className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Usos actuales</label>
              <input type="number" value={promoF.usado} onChange={e => setPromoF(p => ({ ...p, usado: parseInt(e.target.value) || 0 }))} className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Límite</label>
              <input type="number" value={promoF.limite} onChange={e => setPromoF(p => ({ ...p, limite: parseInt(e.target.value) || 100 }))} className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Activa</label>
            <button onClick={() => setPromoF(p => ({ ...p, activo: !p.activo }))} className={`relative w-12 h-6 rounded-full transition-all ${promoF.activo ? 'bg-orange-600' : 'bg-stone-800'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${promoF.activo ? 'left-6' : 'left-0.5'}`}></div>
            </button>
          </div>
          <button onClick={savePromo} className="w-full mt-6 bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl">
            {modalMode === 'add' ? 'Crear Promoción' : 'Guardar Cambios'}
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 md:p-12 space-y-10 pb-40 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-brand">Menú Inteligente</h1>
          <p className="text-stone-500 text-sm md:text-base max-w-xl">Gestión de productos, variantes, combos y promociones</p>
        </div>
        <button onClick={() => {
          if (tab === 'productos') openAddProduct();
          else if (tab === 'variantes') openAddVariant();
          else if (tab === 'combos') openAddCombo();
          else if (tab === 'promociones') openAddPromo();
          else showToast('Acción no disponible en esta sección');
        }} className="w-full md:w-auto flex items-center justify-center gap-4 bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95">
          <i className="fas fa-plus"></i> NUEVO {tab === 'productos' ? 'PRODUCTO' : tab === 'variantes' ? 'VARIANTE' : tab === 'combos' ? 'COMBO' : tab === 'promociones' ? 'PROMO' : ''}
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
            <span className="ml-1 text-[9px] opacity-60">
              {t.key === 'productos' ? productos.length : t.key === 'variantes' ? variantes.length : t.key === 'combos' ? combos.length : t.key === 'promociones' ? promociones.length : ''}
            </span>
          </button>
        ))}
      </div>

      {/* TAB: Productos */}
      {tab === 'productos' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {productos.length === 0 && <EmptyState icon="fa-pizza-slice" text="No hay productos. Crea el primero." />}
          {productos.map(p => (
            <div key={p.id} className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-orange-500/40 transition-all shadow-xl relative">
              <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditProduct(p)} className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-orange-500 border border-white/10 hover:border-orange-500/30 transition-all">
                  <i className="fas fa-pen text-xs"></i>
                </button>
                <button onClick={() => deleteProduct(p.id)} className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-red-500 border border-white/10 hover:border-red-500/30 transition-all">
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
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
                    onClick={() => setProductos(prev => prev.map(pp => pp.id === p.id ? { ...pp, disponible: !pp.disponible } : pp))}
                    className={`relative w-12 h-6 rounded-full transition-all ${
                      p.disponible ? 'bg-orange-600' : 'bg-stone-800'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      p.disponible ? 'left-6' : 'left-0.5'
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
        <div className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 shadow-xl">
          <div className="p-8 border-b border-white/5">
            <h3 className="font-black text-sm uppercase tracking-widest text-stone-300">
              <i className="fas fa-ruler-combined text-orange-500 mr-4"></i>
              Opciones de Tamaño y Variantes
            </h3>
          </div>
          {variantes.length === 0 && <div className="p-12 text-center text-stone-600 font-bold text-sm uppercase tracking-widest">No hay variantes. Crea una.</div>}
          {Array.from(new Set(variantes.map(v => v.producto))).map(producto => {
            const variantesDeProducto = variantes.filter(v => v.producto === producto);
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
                      {variantesDeProducto.length} variantes
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-8 pb-6 space-y-3">
                    {variantesDeProducto.map(v => (
                      <div key={v.id} className="flex items-center justify-between bg-stone-950/50 px-6 py-4 rounded-2xl border border-white/5 group/variant">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${v.activo ? 'bg-green-500' : 'bg-stone-700'}`}></div>
                          <span className="font-bold text-stone-300">{v.tamano}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={`font-black ${v.precioMod === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                            {v.precioMod === 0 ? 'Incluido' : `+${formatPrice(v.precioMod)}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditVariant(v)} className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:text-orange-500 opacity-0 group-hover/variant:opacity-100 transition-all">
                              <i className="fas fa-pen text-[10px]"></i>
                            </button>
                            <button onClick={() => deleteVariant(v.id)} className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:text-red-500 opacity-0 group-hover/variant:opacity-100 transition-all">
                              <i className="fas fa-trash text-[10px]"></i>
                            </button>
                            <button
                              onClick={() => toggleVariant(v.id)}
                              className={`relative w-10 h-5 rounded-full transition-all ml-2 ${v.activo ? 'bg-orange-600' : 'bg-stone-800'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${v.activo ? 'left-5' : 'left-0.5'}`}></div>
                            </button>
                          </div>
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
          {combos.length === 0 && <EmptyState icon="fa-box-open" text="No hay combos. Crea el primero." />}
          {combos.map(c => (
            <div key={c.id} className={`bg-gradient-to-br ${c.color} bg-stone-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-orange-500/30 transition-all shadow-xl relative`}>
              <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditCombo(c)} className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-orange-500 border border-white/10 hover:border-orange-500/30 transition-all">
                  <i className="fas fa-pen text-xs"></i>
                </button>
                <button onClick={() => deleteCombo(c.id)} className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-red-500 border border-white/10 hover:border-red-500/30 transition-all">
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
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
          {promociones.length === 0 && <EmptyState icon="fa-tag" text="No hay promociones. Crea la primera." />}
          {promociones.map(p => (
            <div key={p.id} className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 p-8 group hover:border-orange-500/30 transition-all shadow-xl space-y-6 relative">
              <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditPromo(p)} className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-orange-500 border border-white/10 hover:border-orange-500/30 transition-all">
                  <i className="fas fa-pen text-xs"></i>
                </button>
                <button onClick={() => deletePromo(p.id)} className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-red-500 border border-white/10 hover:border-red-500/30 transition-all">
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
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
                  onClick={() => togglePromo(p.id)}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    p.activo ? 'bg-orange-600' : 'bg-stone-800'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    p.activo ? 'left-6' : 'left-0.5'
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
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-black rounded-lg"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-4 border-black rounded-lg"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-4 border-black rounded-lg"></div>
                  <div className="absolute top-[18px] left-[18px] w-6 h-6 bg-black rounded"></div>
                  <div className="absolute top-[18px] right-[18px] w-6 h-6 bg-black rounded"></div>
                  <div className="absolute bottom-[18px] left-[18px] w-6 h-6 bg-black rounded"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid grid-cols-5 gap-1.5">
                      {Array.from({ length: 25 }, (_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-sm ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`}></div>
                      ))}
                    </div>
                  </div>
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

      {/* Modals */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${modalMode === 'add' ? 'Nuevo' : 'Editar'} ${modalEntity}`}>
        {renderModalBody()}
      </Modal>

      <ConfirmDialog open={confirmOpen} message="¿Eliminar este elemento? Esta acción no se puede deshacer." onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />

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
