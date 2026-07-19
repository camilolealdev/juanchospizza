import React, { useEffect, useState } from 'react';
import { api, MenuVariant, MenuCombo, MenuPromotion, PizzaMenuSize } from '../../services/api';
import { Product, Category } from '../../types';

type Tab = 'productos' | 'variantes' | 'tamanos' | 'combos' | 'promociones' | 'menuqr';
type ModalMode = 'add' | 'edit';

const PROMO_TIPOS = ['Porcentaje', 'Compre y Lleve', 'Fijo'];
const COMBO_GRADIENTS = [
  'from-orange-900/40 to-orange-950/20',
  'from-pink-900/30 to-pink-950/10',
  'from-sky-900/30 to-sky-950/10',
  'from-purple-900/30 to-purple-950/10',
  'from-emerald-900/30 to-emerald-950/10',
];
const CATEGORY_COLORS = [
  'bg-orange-600',
  'bg-amber-600',
  'bg-red-600',
  'bg-yellow-700',
  'bg-pink-700',
  'bg-blue-700',
  'bg-purple-700',
];

// Deterministic decoration only — these have no backing DB column, so they're
// derived from the id rather than stored/edited.
const hashIndex = (id: string, mod: number) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
};
const colorForCategory = (categoryId: string | null) =>
  CATEGORY_COLORS[hashIndex(categoryId || '', CATEGORY_COLORS.length)];
const gradientForCombo = (id: string) => COMBO_GRADIENTS[hashIndex(id, COMBO_GRADIENTS.length)];

const formatPrice = (price: number) => '$' + price.toLocaleString('es-CO');
const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const formatPromoValue = (tipo: string | null, valor: number) => {
  if (tipo === 'Porcentaje') return `${valor}% OFF`;
  if (tipo === 'Compre y Lleve') return `${valor}x1`;
  return `-${formatPrice(valor)}`;
};

// Minimal CSV parser -- handles quoted fields (so descriptions/names can
// contain commas) without pulling in a dependency for a single import form.
// Not a general CSV/RFC4180 implementation (no embedded newlines inside
// quoted fields), which is fine for a flat product list.
const parseCsv = (text: string): string[][] => {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cells.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  });
};

const CSV_TRUE = new Set(['true', '1', 'si', 'sí', 'yes']);

const PRODUCT_CSV_TEMPLATE =
  'nombre,categoria,precio,descripcion,tiempo,popularidad,vegetariano,premium,exclusiva\n' +
  'Pizza Especial Juancho\'s,Pizzas,24900,"Salsa casera, mozzarella, pepperoni",25,80,no,no,no\n';

const renderStars = (n: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <i key={i} className={`fas fa-star text-[10px] ${i < n ? 'text-orange-500' : 'text-stone-700'}`}></i>
  ));

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'productos', label: 'Productos', icon: 'fa-pizza-slice' },
  { key: 'variantes', label: 'Variantes', icon: 'fa-ruler-combined' },
  { key: 'tamanos', label: 'Tamaños de Pizza', icon: 'fa-ruler' },
  { key: 'combos', label: 'Combos', icon: 'fa-box-open' },
  { key: 'promociones', label: 'Promociones', icon: 'fa-tag' },
  { key: 'menuqr', label: 'Menú QR', icon: 'fa-qrcode' },
];

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-stone-950 border border-white/10 rounded-[2.5rem] shadow-2xl animate-zoom-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-white/5">
          <h3 className="font-black text-lg text-white uppercase tracking-wider">{title}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-stone-500 hover:text-white hover:bg-stone-800 transition-all"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-8 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

/* ─── Confirm Dialog ─── */
const ConfirmDialog: React.FC<{ open: boolean; message: string; onConfirm: () => void; onCancel: () => void }> = ({
  open,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-stone-950 border border-white/10 rounded-[2rem] p-8 shadow-2xl animate-zoom-in text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-red-600/20 flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-trash text-red-500 text-xl"></i>
        </div>
        <p className="text-stone-300 font-bold text-sm mb-8">{message}</p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-4 rounded-[1.5rem] bg-stone-900 text-stone-400 font-black text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 rounded-[1.5rem] bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all"
          >
            Eliminar
          </button>
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
  const [loading, setLoading] = useState(true);

  /* Data state — loaded from the real API */
  const [categories, setCategories] = useState<Category[]>([]);
  const [productos, setProductos] = useState<Product[]>([]);
  const [variantes, setVariantes] = useState<MenuVariant[]>([]);
  const [tamanos, setTamanos] = useState<PizzaMenuSize[]>([]);
  const [combos, setCombos] = useState<MenuCombo[]>([]);
  const [promociones, setPromociones] = useState<MenuPromotion[]>([]);

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [modalEntity, setModalEntity] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  /* ── Product form ── */
  const [pf, setPf] = useState({ nombre: '', categoryId: '', basePrice: 0, popularidad: 3 });
  const [editProductId, setEditProductId] = useState<string | null>(null);

  /* ── Bulk CSV import ── */
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    errors: { row: number; nombre?: string; error: string }[];
  } | null>(null);

  /* ── Variant form ── */
  const [vf, setVf] = useState({ productoId: '', nombre: '', precioModificador: 0, activo: true });
  const [editVariantId, setEditVariantId] = useState<string | null>(null);

  /* ── Pizza size form ── */
  const [tf, setTf] = useState({ nombre: '', precio: 0, incluidos: 1, porciones: 4, activo: true });
  const [editTamanoId, setEditTamanoId] = useState<string | null>(null);

  /* ── Combo form ── */
  const [cf, setCf] = useState({ nombre: '', descripcion: '', precioTotal: 0, ahorro: 0, itemsText: '' });
  const [editComboId, setEditComboId] = useState<string | null>(null);

  /* ── Promo form ── */
  const [promoF, setPromoF] = useState({
    nombre: '',
    tipo: PROMO_TIPOS[0],
    valor: 0,
    inicia: '',
    termina: '',
    limite: 100,
    activo: true,
  });
  const [editPromoId, setEditPromoId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };
  const showError = (prefix: string, e: unknown) =>
    showToast(`${prefix}: ${e instanceof Error ? e.message : 'error desconocido'}`);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cats, prods, vars, sizes, cbs, promos] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
        api.getMenuVariants(),
        api.getPizzaSizes(),
        api.getMenuCombos(),
        api.getMenuPromotions(),
      ]);
      setCategories(cats);
      setProductos(prods);
      setVariantes(vars);
      setTamanos(sizes);
      setCombos(cbs);
      setPromociones(promos);
    } catch (e) {
      showError('Error cargando el menú', e);
    } finally {
      setLoading(false);
    }
  };

  // loadAll is redefined every render (not memoized) -- including it would
  // refire this on every render instead of once on mount.

  useEffect(() => {
    loadAll();
  }, []);

  const reloadProductos = () =>
    api
      .getProducts()
      .then(setProductos)
      .catch((e) => showError('Error recargando productos', e));
  const reloadVariantes = () =>
    api
      .getMenuVariants()
      .then(setVariantes)
      .catch((e) => showError('Error recargando variantes', e));
  const reloadTamanos = () =>
    api
      .getPizzaSizes()
      .then(setTamanos)
      .catch((e) => showError('Error recargando tamaños', e));
  const reloadCombos = () =>
    api
      .getMenuCombos()
      .then(setCombos)
      .catch((e) => showError('Error recargando combos', e));
  const reloadPromociones = () =>
    api
      .getMenuPromotions()
      .then(setPromociones)
      .catch((e) => showError('Error recargando promociones', e));

  const productName = (id: string | null) => productos.find((p) => p.id === id)?.nombre || '(producto eliminado)';

  /* ── Product CRUD ── */
  const openAddProduct = () => {
    setModalMode('add');
    setModalEntity('producto');
    setPf({ nombre: '', categoryId: categories[0]?.id || '', basePrice: 0, popularidad: 3 });
    setEditProductId(null);
    setModalOpen(true);
  };
  const openEditProduct = (p: Product) => {
    setModalMode('edit');
    setModalEntity('producto');
    setPf({ nombre: p.nombre, categoryId: p.categoryId, basePrice: p.basePrice, popularidad: p.popularidad || 3 });
    setEditProductId(p.id);
    setModalOpen(true);
  };
  const saveProduct = async () => {
    if (!pf.nombre.trim() || pf.basePrice <= 0) {
      showToast('Completa nombre y precio');
      return;
    }
    try {
      if (modalMode === 'add') {
        await api.createProduct({
          nombre: pf.nombre,
          categoryId: pf.categoryId,
          basePrice: pf.basePrice,
          popularidad: pf.popularidad,
        });
        showToast(`"${pf.nombre}" creado`);
      } else if (editProductId) {
        await api.updateProduct(editProductId, {
          nombre: pf.nombre,
          categoryId: pf.categoryId,
          basePrice: pf.basePrice,
          popularidad: pf.popularidad,
        });
        showToast('Producto actualizado');
      }
      setModalOpen(false);
      reloadProductos();
    } catch (e) {
      showError('Error guardando producto', e);
    }
  };
  const deleteProduct = (id: string) => {
    setConfirmAction(() => async () => {
      try {
        await api.deleteProduct(id);
        showToast('Producto eliminado');
        reloadProductos();
      } catch (e) {
        showError('Error eliminando producto', e);
      } finally {
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([PRODUCT_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'productos-plantilla.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFile = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error('El archivo no tiene filas de datos (solo encabezado o vacío)');
      const header = rows[0].map((h) => h.toLowerCase());
      const idx = (name: string) => header.indexOf(name);
      const products = rows.slice(1).map((cells) => {
        const categoriaNombre = cells[idx('categoria')] || '';
        const category = categories.find((c) => c.name.toLowerCase() === categoriaNombre.toLowerCase());
        return {
          nombre: cells[idx('nombre')] || '',
          categoryId: category?.id || '',
          basePrice: Number(cells[idx('precio')]) || 0,
          descripcion: idx('descripcion') >= 0 ? cells[idx('descripcion')] : '',
          tiempo: idx('tiempo') >= 0 ? Number(cells[idx('tiempo')]) || 0 : 0,
          popularidad: idx('popularidad') >= 0 ? Number(cells[idx('popularidad')]) || 0 : 0,
          vegetariano: idx('vegetariano') >= 0 && CSV_TRUE.has(cells[idx('vegetariano')].toLowerCase()),
          isPremium: idx('premium') >= 0 && CSV_TRUE.has(cells[idx('premium')].toLowerCase()),
          exclusiva: idx('exclusiva') >= 0 && CSV_TRUE.has(cells[idx('exclusiva')].toLowerCase()),
        };
      });
      const result = await api.bulkImportProducts(products);
      setImportResult(result);
      if (result.inserted > 0) reloadProductos();
    } catch (e) {
      setImportResult({
        inserted: 0,
        errors: [{ row: 0, error: e instanceof Error ? e.message : 'No se pudo leer el archivo' }],
      });
    } finally {
      setImporting(false);
    }
  };

  /* ── Variant CRUD ── */
  const openAddVariant = () => {
    setModalMode('add');
    setModalEntity('variante');
    setVf({ productoId: productos[0]?.id || '', nombre: '', precioModificador: 0, activo: true });
    setEditVariantId(null);
    setModalOpen(true);
  };
  const openEditVariant = (v: MenuVariant) => {
    setModalMode('edit');
    setModalEntity('variante');
    setVf({
      productoId: v.productoId || '',
      nombre: v.nombre,
      precioModificador: v.precioModificador,
      activo: v.activo,
    });
    setEditVariantId(v.id);
    setModalOpen(true);
  };
  const saveVariant = async () => {
    if (!vf.productoId || !vf.nombre.trim()) {
      showToast('Completa todos los campos');
      return;
    }
    try {
      if (modalMode === 'add') {
        await api.createMenuVariant(vf);
        showToast(`Variante "${vf.nombre}" creada`);
      } else if (editVariantId) {
        await api.updateMenuVariant(editVariantId, vf);
        showToast('Variante actualizada');
      }
      setModalOpen(false);
      reloadVariantes();
    } catch (e) {
      showError('Error guardando variante', e);
    }
  };
  const deleteVariant = (id: string) => {
    setConfirmAction(() => async () => {
      try {
        await api.deleteMenuVariant(id);
        showToast('Variante eliminada');
        reloadVariantes();
      } catch (e) {
        showError('Error eliminando variante', e);
      } finally {
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };
  const toggleVariant = async (v: MenuVariant) => {
    try {
      await api.updateMenuVariant(v.id, { activo: !v.activo });
      reloadVariantes();
    } catch (e) {
      showError('Error actualizando variante', e);
    }
  };

  /* ── Pizza size CRUD -- Small/Junior/Mediana/Familiar, usados por el menú de
     sabores fijos Y por el armador "Crea tu pizza" del sitio público. ── */
  const openAddTamano = () => {
    setModalMode('add');
    setModalEntity('tamano');
    setTf({ nombre: '', precio: 0, incluidos: 1, porciones: 4, activo: true });
    setEditTamanoId(null);
    setModalOpen(true);
  };
  const openEditTamano = (s: PizzaMenuSize) => {
    setModalMode('edit');
    setModalEntity('tamano');
    setTf({ nombre: s.nombre, precio: s.precio, incluidos: s.incluidos, porciones: s.porciones || 0, activo: s.activo });
    setEditTamanoId(s.id);
    setModalOpen(true);
  };
  const saveTamano = async () => {
    if (!tf.nombre.trim()) {
      showToast('Completa el nombre del tamaño');
      return;
    }
    try {
      if (modalMode === 'add') {
        await api.createPizzaSize(tf);
        showToast(`Tamaño "${tf.nombre}" creado`);
      } else if (editTamanoId) {
        await api.updatePizzaSize(editTamanoId, tf);
        showToast('Tamaño actualizado');
      }
      setModalOpen(false);
      reloadTamanos();
    } catch (e) {
      showError('Error guardando tamaño', e);
    }
  };
  const deleteTamano = (id: string) => {
    setConfirmAction(() => async () => {
      try {
        await api.deletePizzaSize(id);
        showToast('Tamaño eliminado');
        reloadTamanos();
      } catch (e) {
        showError('Error eliminando tamaño', e);
      } finally {
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };
  const toggleTamano = async (s: PizzaMenuSize) => {
    try {
      await api.updatePizzaSize(s.id, { activo: !s.activo });
      reloadTamanos();
    } catch (e) {
      showError('Error actualizando tamaño', e);
    }
  };

  /* ── Combo CRUD ── */
  const openAddCombo = () => {
    setModalMode('add');
    setModalEntity('combo');
    setCf({ nombre: '', descripcion: '', precioTotal: 0, ahorro: 0, itemsText: '' });
    setEditComboId(null);
    setModalOpen(true);
  };
  const openEditCombo = (c: MenuCombo) => {
    setModalMode('edit');
    setModalEntity('combo');
    setCf({
      nombre: c.nombre,
      descripcion: c.descripcion || '',
      precioTotal: c.precioTotal,
      ahorro: c.ahorro,
      itemsText: c.productos.join(', '),
    });
    setEditComboId(c.id);
    setModalOpen(true);
  };
  const saveCombo = async () => {
    if (!cf.nombre.trim() || cf.precioTotal <= 0) {
      showToast('Completa nombre y precio');
      return;
    }
    const productos = cf.itemsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (productos.length === 0) {
      showToast('Agrega al menos un item');
      return;
    }
    try {
      if (modalMode === 'add') {
        await api.createMenuCombo({
          nombre: cf.nombre,
          descripcion: cf.descripcion,
          precioTotal: cf.precioTotal,
          ahorro: cf.ahorro,
          productos,
        });
        showToast(`Combo "${cf.nombre}" creado`);
      } else if (editComboId) {
        await api.updateMenuCombo(editComboId, {
          nombre: cf.nombre,
          descripcion: cf.descripcion,
          precioTotal: cf.precioTotal,
          ahorro: cf.ahorro,
          productos,
        });
        showToast('Combo actualizado');
      }
      setModalOpen(false);
      reloadCombos();
    } catch (e) {
      showError('Error guardando combo', e);
    }
  };
  const deleteCombo = (id: string) => {
    setConfirmAction(() => async () => {
      try {
        await api.deleteMenuCombo(id);
        showToast('Combo eliminado');
        reloadCombos();
      } catch (e) {
        showError('Error eliminando combo', e);
      } finally {
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  /* ── Promo CRUD ── */
  const openAddPromo = () => {
    setModalMode('add');
    setModalEntity('promocion');
    setPromoF({ nombre: '', tipo: PROMO_TIPOS[0], valor: 0, inicia: '', termina: '', limite: 100, activo: true });
    setEditPromoId(null);
    setModalOpen(true);
  };
  const openEditPromo = (p: MenuPromotion) => {
    setModalMode('edit');
    setModalEntity('promocion');
    setPromoF({
      nombre: p.nombre,
      tipo: p.tipo || PROMO_TIPOS[0],
      valor: p.valor,
      inicia: p.inicia ? p.inicia.slice(0, 10) : '',
      termina: p.termina ? p.termina.slice(0, 10) : '',
      limite: p.limite,
      activo: p.activo,
    });
    setEditPromoId(p.id);
    setModalOpen(true);
  };
  const savePromo = async () => {
    if (!promoF.nombre.trim() || promoF.valor <= 0) {
      showToast('Completa nombre y valor');
      return;
    }
    try {
      if (modalMode === 'add') {
        await api.createMenuPromotion(promoF);
        showToast(`Promo "${promoF.nombre}" creada`);
      } else if (editPromoId) {
        await api.updateMenuPromotion(editPromoId, promoF);
        showToast('Promoción actualizada');
      }
      setModalOpen(false);
      reloadPromociones();
    } catch (e) {
      showError('Error guardando promoción', e);
    }
  };
  const deletePromo = (id: string) => {
    setConfirmAction(() => async () => {
      try {
        await api.deleteMenuPromotion(id);
        showToast('Promoción eliminada');
        reloadPromociones();
      } catch (e) {
        showError('Error eliminando promoción', e);
      } finally {
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };
  const togglePromo = async (p: MenuPromotion) => {
    try {
      await api.updateMenuPromotion(p.id, { activo: !p.activo });
      reloadPromociones();
    } catch (e) {
      showError('Error actualizando promoción', e);
    }
  };

  /* ── Modal body ── */
  const renderModalBody = () => {
    if (modalEntity === 'producto') {
      return (
        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Nombre del Producto
            </label>
            <input
              value={pf.nombre}
              onChange={(e) => setPf((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Pizza de Pepperoni"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Categoría
            </label>
            <select
              value={pf.categoryId}
              onChange={(e) => setPf((p) => ({ ...p, categoryId: e.target.value }))}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Precio ($)
            </label>
            <input
              type="number"
              value={pf.basePrice || ''}
              onChange={(e) => setPf((p) => ({ ...p, basePrice: parseInt(e.target.value) || 0 }))}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Popularidad (1-5)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setPf((p) => ({ ...p, popularidad: n }))}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${n <= pf.popularidad ? 'bg-orange-600 text-white' : 'bg-stone-900 text-stone-600 border border-white/5'}`}
                >
                  <i className="fas fa-star text-sm"></i>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={saveProduct}
            className="w-full mt-6 bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl"
          >
            {modalMode === 'add' ? 'Crear Producto' : 'Guardar Cambios'}
          </button>
        </div>
      );
    }
    if (modalEntity === 'variante') {
      return (
        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Producto
            </label>
            <select
              value={vf.productoId}
              onChange={(e) => setVf((v) => ({ ...v, productoId: e.target.value }))}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Tamaño / Variante
            </label>
            <input
              value={vf.nombre}
              onChange={(e) => setVf((v) => ({ ...v, nombre: e.target.value }))}
              placeholder="Ej: Grande, 12 unidades, Doble"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Recargo ($) — 0 si es precio base
            </label>
            <input
              type="number"
              value={vf.precioModificador || ''}
              onChange={(e) => setVf((v) => ({ ...v, precioModificador: parseInt(e.target.value) || 0 }))}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Activo</label>
            <button
              onClick={() => setVf((v) => ({ ...v, activo: !v.activo }))}
              className={`relative w-12 h-6 rounded-full transition-all ${vf.activo ? 'bg-orange-600' : 'bg-stone-800'}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${vf.activo ? 'left-6' : 'left-0.5'}`}
              ></div>
            </button>
          </div>
          <button
            onClick={saveVariant}
            className="w-full mt-6 bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl"
          >
            {modalMode === 'add' ? 'Crear Variante' : 'Guardar Cambios'}
          </button>
        </div>
      );
    }
    if (modalEntity === 'tamano') {
      return (
        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Nombre
            </label>
            <input
              value={tf.nombre}
              onChange={(e) => setTf((v) => ({ ...v, nombre: e.target.value }))}
              placeholder="Ej: Familiar"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Precio ($)
            </label>
            <input
              type="number"
              value={tf.precio || ''}
              onChange={(e) => setTf((v) => ({ ...v, precio: parseInt(e.target.value) || 0 }))}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Ingredientes/sabores incluidos
            </label>
            <input
              type="number"
              value={tf.incluidos || ''}
              onChange={(e) => setTf((v) => ({ ...v, incluidos: parseInt(e.target.value) || 0 }))}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Porciones
            </label>
            <input
              type="number"
              value={tf.porciones || ''}
              onChange={(e) => setTf((v) => ({ ...v, porciones: parseInt(e.target.value) || 0 }))}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Activo</label>
            <button
              onClick={() => setTf((v) => ({ ...v, activo: !v.activo }))}
              className={`relative w-12 h-6 rounded-full transition-all ${tf.activo ? 'bg-orange-600' : 'bg-stone-800'}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${tf.activo ? 'left-6' : 'left-0.5'}`}
              ></div>
            </button>
          </div>
          <button
            onClick={saveTamano}
            className="w-full mt-6 bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl"
          >
            {modalMode === 'add' ? 'Crear Tamaño' : 'Guardar Cambios'}
          </button>
        </div>
      );
    }
    if (modalEntity === 'combo') {
      return (
        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Nombre del Combo
            </label>
            <input
              value={cf.nombre}
              onChange={(e) => setCf((c) => ({ ...c, nombre: e.target.value }))}
              placeholder="Ej: Combo Mega"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Descripción
            </label>
            <input
              value={cf.descripcion}
              onChange={(e) => setCf((c) => ({ ...c, descripcion: e.target.value }))}
              placeholder="Ej: 2 pizzas + gaseosa"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
                Precio ($)
              </label>
              <input
                type="number"
                value={cf.precioTotal || ''}
                onChange={(e) => setCf((c) => ({ ...c, precioTotal: parseInt(e.target.value) || 0 }))}
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
                Ahorro ($)
              </label>
              <input
                type="number"
                value={cf.ahorro || ''}
                onChange={(e) => setCf((c) => ({ ...c, ahorro: parseInt(e.target.value) || 0 }))}
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Items (separados por coma)
            </label>
            <textarea
              value={cf.itemsText}
              onChange={(e) => setCf((c) => ({ ...c, itemsText: e.target.value }))}
              placeholder="Ej: Pizza Personal, Gaseosa 1.5L, Postre"
              rows={3}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors resize-none"
            />
            {cf.itemsText && (
              <div className="flex flex-wrap gap-2 mt-3">
                {cf.itemsText.split(',').map(
                  (item, i) =>
                    item.trim() && (
                      <span
                        key={i}
                        className="text-[9px] font-black text-orange-500 uppercase tracking-wider bg-orange-950/30 px-3 py-1 rounded-full border border-orange-500/20"
                      >
                        {item.trim()}
                      </span>
                    )
                )}
              </div>
            )}
          </div>
          <button
            onClick={saveCombo}
            className="w-full mt-6 bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl"
          >
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
            <input
              value={promoF.nombre}
              onChange={(e) => setPromoF((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Cyber Monday"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">Tipo</label>
            <select
              value={promoF.tipo}
              onChange={(e) => setPromoF((p) => ({ ...p, tipo: e.target.value }))}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            >
              {PROMO_TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Valor{' '}
              {promoF.tipo === 'Porcentaje' ? '(%)' : promoF.tipo === 'Compre y Lleve' ? '(ej: 2 para 2x1)' : '($)'}
            </label>
            <input
              type="number"
              value={promoF.valor || ''}
              onChange={(e) => setPromoF((p) => ({ ...p, valor: parseInt(e.target.value) || 0 }))}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
                Inicia
              </label>
              <input
                type="date"
                value={promoF.inicia}
                onChange={(e) => setPromoF((p) => ({ ...p, inicia: e.target.value }))}
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
                Termina
              </label>
              <input
                type="date"
                value={promoF.termina}
                onChange={(e) => setPromoF((p) => ({ ...p, termina: e.target.value }))}
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-2 block">
              Límite de usos
            </label>
            <input
              type="number"
              value={promoF.limite}
              onChange={(e) => setPromoF((p) => ({ ...p, limite: parseInt(e.target.value) || 100 }))}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-orange-600/50 transition-colors"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Activa</label>
            <button
              onClick={() => setPromoF((p) => ({ ...p, activo: !p.activo }))}
              className={`relative w-12 h-6 rounded-full transition-all ${promoF.activo ? 'bg-orange-600' : 'bg-stone-800'}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${promoF.activo ? 'left-6' : 'left-0.5'}`}
              ></div>
            </button>
          </div>
          <button
            onClick={savePromo}
            className="w-full mt-6 bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl"
          >
            {modalMode === 'add' ? 'Crear Promoción' : 'Guardar Cambios'}
          </button>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh] text-stone-500">
        <i className="fas fa-spinner fa-spin text-3xl mr-4"></i>
        <span className="font-bold uppercase tracking-widest text-sm">Cargando menú...</span>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 space-y-10 pb-40 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-brand">Menú Inteligente</h1>
          <p className="text-stone-500 text-sm md:text-base max-w-xl">
            Gestión de productos, variantes, combos y promociones
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {tab === 'productos' && (
            <button
              onClick={() => {
                setImportResult(null);
                setShowImportModal(true);
              }}
              className="flex items-center justify-center gap-4 bg-stone-900/60 hover:bg-stone-800 border border-white/10 hover:border-orange-500/30 px-8 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
            >
              <i className="fas fa-file-csv"></i> CARGAR CSV
            </button>
          )}
          <button
            onClick={() => {
              if (tab === 'productos') openAddProduct();
              else if (tab === 'variantes') openAddVariant();
              else if (tab === 'tamanos') openAddTamano();
              else if (tab === 'combos') openAddCombo();
              else if (tab === 'promociones') openAddPromo();
              else showToast('Acción no disponible en esta sección');
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-4 bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95"
          >
            <i className="fas fa-plus"></i> NUEVO{' '}
            {tab === 'productos'
              ? 'PRODUCTO'
              : tab === 'variantes'
                ? 'VARIANTE'
                : tab === 'tamanos'
                  ? 'TAMAÑO'
                  : tab === 'combos'
                    ? 'COMBO'
                    : tab === 'promociones'
                      ? 'PROMO'
                      : ''}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2">
        {TABS.map((t) => (
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
              {t.key === 'productos'
                ? productos.length
                : t.key === 'variantes'
                  ? variantes.length
                  : t.key === 'tamanos'
                    ? tamanos.length
                    : t.key === 'combos'
                      ? combos.length
                      : t.key === 'promociones'
                        ? promociones.length
                        : ''}
            </span>
          </button>
        ))}
      </div>

      {/* TAB: Productos */}
      {tab === 'productos' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {productos.length === 0 && <EmptyState icon="fa-pizza-slice" text="No hay productos. Crea el primero." />}
          {productos.map((p) => (
            <div
              key={p.id}
              className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-orange-500/40 transition-all shadow-xl relative"
            >
              <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditProduct(p)}
                  className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-orange-500 border border-white/10 hover:border-orange-500/30 transition-all"
                >
                  <i className="fas fa-pen text-xs"></i>
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-red-500 border border-white/10 hover:border-red-500/30 transition-all"
                >
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
              <div
                className={`relative aspect-[4/3] ${colorForCategory(p.categoryId)} flex items-center justify-center overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <i className="fas fa-image text-white/20 text-6xl"></i>
                <span className="absolute bottom-4 left-5 text-[9px] font-black uppercase tracking-[0.3em] bg-black/60 px-4 py-2 rounded-full border border-white/10 text-stone-300">
                  {categories.find((c) => c.id === p.categoryId)?.name || 'Sin categoría'}
                </span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-lg text-white">{p.nombre}</h3>
                  <span className="text-orange-500 font-black text-lg">{formatPrice(p.basePrice)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {renderStars(p.popularidad || 0)}
                  <span className="text-[9px] text-stone-600 font-bold uppercase tracking-wider">
                    ({p.popularidad || 0}.0)
                  </span>
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
          {variantes.length === 0 && (
            <div className="p-12 text-center text-stone-600 font-bold text-sm uppercase tracking-widest">
              No hay variantes. Crea una.
            </div>
          )}
          {Array.from(new Set(variantes.map((v) => v.productoId))).map((productoId) => {
            const variantesDeProducto = variantes.filter((v) => v.productoId === productoId);
            const isExpanded = expanded === productoId;

            return (
              <div key={productoId || 'sin-producto'} className="border-b border-white/5 last:border-0">
                <button
                  onClick={() => setExpanded(isExpanded ? null : productoId)}
                  className="w-full flex items-center justify-between px-8 py-6 hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-xl bg-stone-950 flex items-center justify-center transition-all ${isExpanded ? 'text-orange-500' : 'text-stone-600'}`}
                    >
                      <i className={`fas fa-chevron-right text-xs transition-all ${isExpanded ? 'rotate-90' : ''}`}></i>
                    </div>
                    <span className="font-black text-base text-white">{productName(productoId)}</span>
                    <span className="text-[9px] text-stone-600 font-bold uppercase tracking-wider bg-stone-950 px-3 py-1 rounded-full border border-white/5">
                      {variantesDeProducto.length} variantes
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-8 pb-6 space-y-3">
                    {variantesDeProducto.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between bg-stone-950/50 px-6 py-4 rounded-2xl border border-white/5 group/variant"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${v.activo ? 'bg-green-500' : 'bg-stone-700'}`}></div>
                          <span className="font-bold text-stone-300">{v.nombre}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <span
                            className={`font-black ${v.precioModificador === 0 ? 'text-green-500' : 'text-orange-500'}`}
                          >
                            {v.precioModificador === 0 ? 'Incluido' : `+${formatPrice(v.precioModificador)}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditVariant(v)}
                              className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:text-orange-500 opacity-0 group-hover/variant:opacity-100 transition-all"
                            >
                              <i className="fas fa-pen text-[10px]"></i>
                            </button>
                            <button
                              onClick={() => deleteVariant(v.id)}
                              className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:text-red-500 opacity-0 group-hover/variant:opacity-100 transition-all"
                            >
                              <i className="fas fa-trash text-[10px]"></i>
                            </button>
                            <button
                              onClick={() => toggleVariant(v)}
                              className={`relative w-10 h-5 rounded-full transition-all ml-2 ${v.activo ? 'bg-orange-600' : 'bg-stone-800'}`}
                            >
                              <div
                                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${v.activo ? 'left-5' : 'left-0.5'}`}
                              ></div>
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

      {/* TAB: Tamaños de Pizza */}
      {tab === 'tamanos' && (
        <div className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 shadow-xl">
          <div className="p-8 border-b border-white/5">
            <h3 className="font-black text-sm uppercase tracking-widest text-stone-300">
              <i className="fas fa-ruler text-orange-500 mr-4"></i>
              Tamaños de Pizza (menú fijo + armador &quot;Crea tu pizza&quot;)
            </h3>
          </div>
          {tamanos.length === 0 && (
            <div className="p-12 text-center text-stone-600 font-bold text-sm uppercase tracking-widest">
              No hay tamaños. Crea uno.
            </div>
          )}
          <div className="p-8 space-y-3">
            {tamanos.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between bg-stone-950/50 px-6 py-4 rounded-2xl border border-white/5 group/tamano"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${s.activo ? 'bg-green-500' : 'bg-stone-700'}`}></div>
                  <span className="font-black text-base text-white">{s.nombre}</span>
                  <span className="text-[9px] text-stone-600 font-bold uppercase tracking-wider bg-stone-950 px-3 py-1 rounded-full border border-white/5">
                    {s.incluidos} incluido{s.incluidos === 1 ? '' : 's'} · {s.porciones ?? 0} porciones
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-black text-orange-500">{formatPrice(s.precio)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditTamano(s)}
                      className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:text-orange-500 opacity-0 group-hover/tamano:opacity-100 transition-all"
                    >
                      <i className="fas fa-pen text-[10px]"></i>
                    </button>
                    <button
                      onClick={() => deleteTamano(s.id)}
                      className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:text-red-500 opacity-0 group-hover/tamano:opacity-100 transition-all"
                    >
                      <i className="fas fa-trash text-[10px]"></i>
                    </button>
                    <button
                      onClick={() => toggleTamano(s)}
                      className={`relative w-10 h-5 rounded-full transition-all ml-2 ${s.activo ? 'bg-orange-600' : 'bg-stone-800'}`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${s.activo ? 'left-5' : 'left-0.5'}`}
                      ></div>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Combos */}
      {tab === 'combos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {combos.length === 0 && <EmptyState icon="fa-box-open" text="No hay combos. Crea el primero." />}
          {combos.map((c) => (
            <div
              key={c.id}
              className={`bg-gradient-to-br ${gradientForCombo(c.id)} bg-stone-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-orange-500/30 transition-all shadow-xl relative`}
            >
              <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditCombo(c)}
                  className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-orange-500 border border-white/10 hover:border-orange-500/30 transition-all"
                >
                  <i className="fas fa-pen text-xs"></i>
                </button>
                <button
                  onClick={() => deleteCombo(c.id)}
                  className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-red-500 border border-white/10 hover:border-red-500/30 transition-all"
                >
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
                  {c.productos.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <i className="fas fa-check-circle text-orange-500 text-xs"></i>
                      <span className="text-stone-300 text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-stone-500 text-[10px] line-through font-black">
                    {formatPrice(c.precioTotal + c.ahorro)}
                  </span>
                  <span className="text-orange-500 font-black text-3xl">{formatPrice(c.precioTotal)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Promociones */}
      {tab === 'promociones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {promociones.length === 0 && <EmptyState icon="fa-tag" text="No hay promociones. Crea la primera." />}
          {promociones.map((p) => (
            <div
              key={p.id}
              className="bg-stone-900/40 rounded-[2.5rem] border border-white/5 p-8 group hover:border-orange-500/30 transition-all shadow-xl space-y-6 relative"
            >
              <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditPromo(p)}
                  className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-orange-500 border border-white/10 hover:border-orange-500/30 transition-all"
                >
                  <i className="fas fa-pen text-xs"></i>
                </button>
                <button
                  onClick={() => deletePromo(p.id)}
                  className="w-9 h-9 rounded-xl bg-stone-950/80 backdrop-blur flex items-center justify-center text-stone-400 hover:text-red-500 border border-white/10 hover:border-red-500/30 transition-all"
                >
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="font-black text-xl text-white">{p.nombre}</h3>
                  <span
                    className={`inline-block text-[9px] font-black uppercase tracking-wider px-4 py-2 rounded-full border ${
                      p.tipo === 'Porcentaje'
                        ? 'text-purple-400 border-purple-500/20 bg-purple-950/30'
                        : p.tipo === 'Compre y Lleve'
                          ? 'text-cyan-400 border-cyan-500/20 bg-cyan-950/30'
                          : 'text-orange-400 border-orange-500/20 bg-orange-950/30'
                    }`}
                  >
                    {p.tipo}
                  </span>
                </div>
                <div
                  className={`text-2xl font-black ${
                    p.tipo === 'Porcentaje'
                      ? 'text-purple-500'
                      : p.tipo === 'Compre y Lleve'
                        ? 'text-cyan-500'
                        : 'text-orange-500'
                  }`}
                >
                  {formatPromoValue(p.tipo, p.valor)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-stone-950/50 rounded-2xl p-4 border border-white/5">
                  <p className="text-[8px] font-black text-stone-600 uppercase tracking-widest mb-1">Inicia</p>
                  <p className="font-bold text-sm text-stone-300">{formatDate(p.inicia)}</p>
                </div>
                <div className="bg-stone-950/50 rounded-2xl p-4 border border-white/5">
                  <p className="text-[8px] font-black text-stone-600 uppercase tracking-widest mb-1">Termina</p>
                  <p className="font-bold text-sm text-stone-300">{formatDate(p.termina)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-stone-500 uppercase tracking-widest">
                  <span>
                    Usos: {p.usado}/{p.limite}
                  </span>
                  <span>{p.limite > 0 ? Math.round((p.usado / p.limite) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-stone-950 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-orange-800 to-orange-500 rounded-full transition-all"
                    style={{ width: `${p.limite > 0 ? Math.min((p.usado / p.limite) * 100, 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">
                  Promoción Activa
                </span>
                <button
                  onClick={() => togglePromo(p)}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    p.activo ? 'bg-orange-600' : 'bg-stone-800'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      p.activo ? 'left-6' : 'left-0.5'
                    }`}
                  ></div>
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
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-sm ${i % 3 === 0 ? 'bg-black' : 'bg-transparent'}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full border-4 border-black flex items-center justify-center">
                    <span className="font-black text-[8px] text-black text-center leading-tight tracking-tighter">
                      GUIDO
                    </span>
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
                <p className="text-stone-500 text-sm">
                  Comparte el menú con tus clientes al instante. Sin contacto, sin esperas.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => window.open('https://wa.me/?text=¡Mira nuestro menú digital!', '_blank')}
                  className="w-full flex items-center justify-between bg-stone-950/60 hover:bg-stone-950 px-8 py-6 rounded-[2rem] border border-white/5 group transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-green-600/20 flex items-center justify-center text-green-500">
                      <i className="fab fa-whatsapp text-xl"></i>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm text-white group-hover:text-orange-500 transition-colors">
                        Compartir en WhatsApp
                      </p>
                      <p className="text-[9px] text-stone-600 font-bold uppercase tracking-wider">Enviar a clientes</p>
                    </div>
                  </div>
                  <i className="fas fa-arrow-right text-stone-600 group-hover:text-orange-500 transition-all"></i>
                </button>

                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-between bg-stone-950/60 hover:bg-stone-950 px-8 py-6 rounded-[2rem] border border-white/5 group transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-600/20 flex items-center justify-center text-orange-500">
                      <i className="fas fa-file-pdf text-xl"></i>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm text-white group-hover:text-orange-500 transition-colors">
                        Descargar PDF
                      </p>
                      <p className="text-[9px] text-stone-600 font-bold uppercase tracking-wider">Versión imprimible</p>
                    </div>
                  </div>
                  <i className="fas fa-arrow-right text-stone-600 group-hover:text-orange-500 transition-all"></i>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + '/menu');
                    showToast('Enlace copiado al portapapeles');
                  }}
                  className="w-full flex items-center justify-between bg-stone-950/60 hover:bg-stone-950 px-8 py-6 rounded-[2rem] border border-white/5 group transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-500">
                      <i className="fas fa-link text-xl"></i>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm text-white group-hover:text-orange-500 transition-colors">
                        Copiar Enlace
                      </p>
                      <p className="text-[9px] text-stone-600 font-bold uppercase tracking-wider">
                        Enlace directo al menú
                      </p>
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
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${modalMode === 'add' ? 'Nuevo' : 'Editar'} ${modalEntity}`}
      >
        {renderModalBody()}
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        message="¿Eliminar este elemento? Esta acción no se puede deshacer."
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
      />

      <Modal open={showImportModal} onClose={() => setShowImportModal(false)} title="Carga masiva de productos (CSV)">
        <div className="p-8 space-y-6">
          <p className="text-stone-400 text-sm">
            Sube un archivo CSV con tus productos. La columna <strong className="text-white">categoria</strong> debe
            coincidir con el nombre exacto de una categoría existente (si no coincide, el producto se crea sin
            categoría).
          </p>
          <button
            onClick={downloadCsvTemplate}
            className="w-full flex items-center justify-center gap-3 bg-stone-900 border border-white/10 hover:border-orange-500/30 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-stone-300"
          >
            <i className="fas fa-download"></i> Descargar plantilla CSV
          </button>

          <label className="block">
            <div className="border-2 border-dashed border-white/10 hover:border-orange-500/40 rounded-2xl p-8 text-center cursor-pointer transition-all bg-stone-950/40">
              <i className="fas fa-file-csv text-3xl text-stone-600 mb-3"></i>
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">
                {importing ? 'Procesando...' : 'Click para elegir un archivo .csv'}
              </p>
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={importing}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCsvFile(f);
                e.target.value = '';
              }}
            />
          </label>

          {importResult && (
            <div className="space-y-3">
              <div
                className={`p-5 rounded-2xl border ${importResult.inserted > 0 ? 'bg-green-950/30 border-green-500/20' : 'bg-red-950/30 border-red-500/20'}`}
              >
                <p className={`font-black text-sm ${importResult.inserted > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {importResult.inserted} producto{importResult.inserted === 1 ? '' : 's'} creado
                  {importResult.inserted === 1 ? '' : 's'}
                  {importResult.errors.length > 0 ? `, ${importResult.errors.length} con error` : ''}
                </p>
              </div>
              {importResult.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-[11px] text-stone-500 bg-stone-900/60 rounded-xl px-4 py-3">
                      {err.row > 0 ? `Fila ${err.row}` : 'Archivo'}
                      {err.nombre ? ` (${err.nombre})` : ''}: {err.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

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
