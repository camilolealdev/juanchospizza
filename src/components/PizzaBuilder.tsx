import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { api, PizzaMenuSize } from '../services/api';
import type { Ingredient } from '../types';
import { getRealIngredientIcon } from '../config/realIngredientIcons';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { lockBodyScroll, unlockBodyScroll } from '../utils/useBodyScrollLock';

// Único armador de pizza del sitio (reemplaza el vanilla #ctp-builder de
// index.html, el builder "avanzado" oculto de public/pizza-builder.js, y el
// modal simplificado que tenía MenuDigital). Se monta en dos formas:
//   variant="section" -> página completa "Crea tu Pizza" (portal en App.tsx)
//   variant="modal"    -> botón "Personalizar" de una pizza en el menú
const EXTRA_INGREDIENTE_PRECIO = 3500;

const GROUP_ORDER = ['carne', 'vegetal', 'fruta', 'extra'] as const;
type GroupKey = (typeof GROUP_ORDER)[number];

const GROUP_LABELS: Record<GroupKey, string> = {
  carne: 'Carnes',
  vegetal: 'Vegetales',
  fruta: 'Frutas & Dulces',
  extra: 'Extras',
};
const GROUP_ICONS: Record<GroupKey, string> = {
  carne: 'fa-drumstick-bite',
  vegetal: 'fa-carrot',
  fruta: 'fa-cookie',
  extra: 'fa-plus-circle',
};
const GROUP_COLORS: Record<GroupKey, string> = {
  carne: '#962D22',
  vegetal: '#6B8E23',
  fruta: '#db2777',
  extra: '#ea580c',
};

interface Sabor {
  id: string;
  nombre: string;
  emoji: string;
  desc: string;
  color: string;
  ings: string[];
}

// id/nombre/emoji/desc/color son presentación (sin equivalente en la DB).
// `ings` se resuelve emparejando `desc` contra los ingredientes reales
// cargados de /api/ingredients (ver resolveSabores más abajo) -- mismo
// enfoque que tenía index.html:407-421.
const SABORES_BASE: Omit<Sabor, 'ings'>[] = [
  { id: 'hawaiana', nombre: 'Hawaiana', emoji: '🍍', desc: 'Piña, Jamón', color: '#e67e22' },
  {
    id: 'pollo_champ',
    nombre: 'Pollo y Champiñones',
    emoji: '🍗',
    desc: 'Jamón, Champiñones, Pollo desmechado',
    color: '#d35400',
  },
  { id: 'carnes', nombre: 'Carnes', emoji: '🥩', desc: 'Jamón, Salami, Cabano', color: '#962D22' },
  {
    id: 'costillitas_bbq',
    nombre: 'Costillitas BBQ',
    emoji: '🦴',
    desc: 'Jamón, Costillas BBQ, Maíz tierno',
    color: '#d35400',
  },
  { id: 'criolla', nombre: 'Criolla', emoji: '🇨🇴', desc: 'Carne desmechada, Maíz tierno', color: '#f39c12' },
  {
    id: 'mexicana',
    nombre: 'Mexicana',
    emoji: '🌮',
    desc: 'Carne molida, Maíz tierno, Tomate, Cilantro, Tostacos',
    color: '#e74c3c',
  },
  {
    id: 'ranchera',
    nombre: 'Ranchera',
    emoji: '🤠',
    desc: 'Champiñones, Cebolla, Maíz tierno, Chorizo',
    color: '#8e44ad',
  },
  {
    id: 'de_la_casa',
    nombre: 'De la Casa',
    emoji: '🏠',
    desc: 'Champiñones, Cebolla, Carne desmechada',
    color: '#2c3e50',
  },
  {
    id: 'espanola',
    nombre: 'Española',
    emoji: '🇪🇸',
    desc: 'Espinaca, Tocineta, Maíz tierno, Champiñones',
    color: '#c0392b',
  },
  { id: 'napolitana', nombre: 'Napolitana', emoji: '🇮🇹', desc: 'Tomate, Orégano', color: '#e74c3c' },
  {
    id: 'vegetariana',
    nombre: 'Vegetariana',
    emoji: '🥗',
    desc: 'Champiñones, Maíz tierno, Cebolla',
    color: '#27ae60',
  },
  { id: 'tropical', nombre: 'Tropical', emoji: '🌴', desc: 'Cerezas, Piña, Duraznos, Uvas pasas', color: '#e84393' },
  { id: 'queso_bocadillo', nombre: 'Queso y Bocadillo', emoji: '🧀', desc: 'Queso extra, Bocadillo', color: '#f39c12' },
];

const normalizeText = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

function resolveSabores(ingredients: Ingredient[]): Sabor[] {
  const idByName = new Map<string, string>();
  ingredients.forEach((ing) => idByName.set(normalizeText(ing.nombre), ing.id));
  return SABORES_BASE.map((s) => ({
    ...s,
    ings: s.desc
      .split(',')
      .map((piece) => idByName.get(normalizeText(piece)))
      .filter((id): id is string => !!id),
  }));
}

// Phyllotaxis -- mismo algoritmo que index.html:383-397, portado a TS.
function generatePizzaPositions(count: number, radiusScale = 0.75) {
  const positions: { x: number; y: number; size: number }[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt((i + 1) / count) * radiusScale;
    const theta = (i + 1) * 137.508;
    positions.push({
      x: 100 + r * 85 * Math.cos((theta * Math.PI) / 180),
      y: 100 + r * 85 * Math.sin((theta * Math.PI) / 180),
      size: 3 + (i % 3) * 1.5,
    });
  }
  return positions;
}
const MASTER_POSITIONS = generatePizzaPositions(120);

interface PizzaBuilderProps {
  variant: 'modal' | 'section';
  productId?: string;
  productName?: string;
  onClose?: () => void;
}

const PizzaBuilder: React.FC<PizzaBuilderProps> = ({ variant, productId = 'pizza-builder', productName, onClose }) => {
  const { addToCart } = useCart();
  const isModal = variant === 'modal';

  useFocusTrap(isModal, () => onClose?.());
  useEffect(() => {
    if (!isModal) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isModal]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sizes, setSizes] = useState<PizzaMenuSize[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [sabores, setSabores] = useState<Sabor[]>([]);

  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawSizes, rawIngredients] = await Promise.all([api.getPizzaSizes(), api.getIngredients()]);
        if (cancelled) return;
        const activeSizes = (rawSizes || []).filter((s) => s.activo).sort((a, b) => a.precio - b.precio);
        const availableIngredients = ((rawIngredients || []) as Ingredient[]).filter((i) => i.disponible);
        setSizes(activeSizes);
        setIngredients(availableIngredients);
        setSabores(resolveSabores(availableIngredients));
        if (activeSizes[1] || activeSizes[0]) setSelectedSizeId((activeSizes[1] || activeSizes[0]).id);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSize = useMemo(() => sizes.find((s) => s.id === selectedSizeId) || null, [sizes, selectedSizeId]);

  const grouped = useMemo(() => {
    const g: Record<GroupKey, Ingredient[]> = { carne: [], vegetal: [], fruta: [], extra: [] };
    ingredients.forEach((ing) => {
      const key = ing.categoria as GroupKey;
      if (g[key]) g[key].push(ing);
    });
    return g;
  }, [ingredients]);

  const filteredGrouped = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) return grouped;
    const filtered: Record<GroupKey, Ingredient[]> = { carne: [], vegetal: [], fruta: [], extra: [] };
    GROUP_ORDER.forEach((key) => {
      filtered[key] = grouped[key].filter((ing) => normalizeText(ing.nombre).includes(q));
    });
    return filtered;
  }, [grouped, searchQuery]);

  const selectedNames = useMemo(
    () => ingredients.filter((i) => selectedIds.has(i.id)).map((i) => i.nombre),
    [ingredients, selectedIds]
  );

  const incluidos = selectedSize?.incluidos ?? 0;
  const extras = Math.max(0, selectedNames.length - incluidos);
  const extraTotal = extras * EXTRA_INGREDIENTE_PRECIO;
  const total = (selectedSize?.precio ?? 0) + extraTotal;

  const toggleIngredient = useCallback((id: string) => {
    setSelectedFlavorId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectSize = useCallback((id: string) => {
    setSelectedSizeId(id);
  }, []);

  const selectSabor = useCallback(
    (saborId: string) => {
      if (selectedFlavorId === saborId) {
        setSelectedFlavorId(null);
        setSelectedIds(new Set());
        return;
      }
      const sabor = sabores.find((s) => s.id === saborId);
      if (!sabor) return;
      setSelectedFlavorId(saborId);
      setSelectedIds(new Set(sabor.ings));
    },
    [sabores, selectedFlavorId]
  );

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedFlavorId(null);
    setSearchQuery('');
  }, []);

  const handleAdd = useCallback(() => {
    if (!selectedSize || selectedIds.size === 0) return;
    const details = `${selectedSize.nombre} · ${selectedNames.slice(0, 5).join(', ')}${
      selectedNames.length > 5 ? ` +${selectedNames.length - 5} más` : ''
    }`;
    addToCart({
      productId,
      name: `${productName || 'Pizza Personalizada'} (${selectedSize.nombre})`,
      price: total,
      quantity: 1,
      details,
      size: selectedSize.nombre,
    });
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      clearAll();
      onClose?.();
    }, 1400);
  }, [selectedSize, selectedIds, selectedNames, addToCart, productId, productName, total, clearAll, onClose]);

  // ---- Vista SVG de la pizza: íconos reales por ingrediente en posiciones
  // phyllotaxis, con un halo de color por categoría detrás. ----
  const toppingNodes = useMemo(() => {
    const selected: { id: string; categoria: GroupKey }[] = [];
    GROUP_ORDER.forEach((key) => {
      grouped[key].forEach((ing) => {
        if (selectedIds.has(ing.id)) selected.push({ id: ing.id, categoria: key });
      });
    });
    return selected.map((ing, idx) => {
      const pos = MASTER_POSITIONS[(idx * 7 + 3) % MASTER_POSITIONS.length];
      const size = 13 + (idx % 3) * 2;
      const color = GROUP_COLORS[ing.categoria];
      return (
        <g key={ing.id}>
          <circle cx={pos.x} cy={pos.y} r={size / 2 + 2} fill={color} opacity={0.15} />
          <image
            href={getRealIngredientIcon(ing.id, ing.categoria)}
            x={pos.x - size / 2}
            y={pos.y - size / 2}
            width={size}
            height={size}
          />
        </g>
      );
    });
  }, [grouped, selectedIds]);

  const cardClass =
    'bg-white rounded-[24px] border border-[#8B572A]/10 shadow-[0_10px_28px_rgba(139,87,42,.08)] p-5 sm:p-6';

  const body = (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Paso 1: tamaño + sabores */}
      <div className={`lg:col-span-4 ${cardClass} space-y-6`}>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1A1A] mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#C0392B] text-white text-xs flex items-center justify-center font-black">
              1
            </span>
            Elige el tamaño
          </h3>
          <div className="flex flex-col gap-2">
            {sizes.map((s) => {
              const active = selectedSizeId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-testid="pizza-size"
                  aria-pressed={active}
                  onClick={() => selectSize(s.id)}
                  className={`w-full text-left rounded-2xl border-2 p-3 transition-all ${
                    active ? 'border-[#C0392B] bg-[#C0392B]/5' : 'border-[#8B572A]/10 hover:border-[#C0392B]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-[#1A1A1A]">{s.nombre}</span>
                    <span className="font-black text-sm text-[#C0392B]">${s.precio.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="text-[10px] text-[#8B572A]/60 font-semibold mt-0.5">
                    {s.incluidos} ingrediente{s.incluidos !== 1 ? 's' : ''} incluido{s.incluidos !== 1 ? 's' : ''}
                    {s.porciones ? ` · ${s.porciones} porciones` : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1A1A] mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#F9DC5C] text-[#1A1A1A] text-xs flex items-center justify-center font-black">
              ⚡
            </span>
            Sabores predefinidos
          </h3>
          <p className="text-[11px] text-[#8B572A]/60 mb-3">Elige uno y sus ingredientes se marcan solos</p>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {sabores.map((s) => {
              const active = selectedFlavorId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSabor(s.id)}
                  disabled={s.ings.length === 0}
                  style={active ? { borderColor: s.color, background: `${s.color}14` } : undefined}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition-all disabled:opacity-30 ${
                    active ? '' : 'border-[#8B572A]/10 hover:border-[#8B572A]/25'
                  }`}
                >
                  <span className="text-lg leading-none">{s.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1A1A1A] truncate">{s.nombre}</div>
                    <div className="text-[10px] text-[#8B572A]/60 truncate">{s.desc}</div>
                  </div>
                  {active && <i className="fas fa-check-circle text-xs ml-auto" style={{ color: s.color }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Paso 2: ingredientes */}
      <div className={`lg:col-span-4 ${cardClass}`}>
        <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1A1A] mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#C0392B] text-white text-xs flex items-center justify-center font-black">
            2
          </span>
          Elige tus ingredientes
        </h3>
        <div className="relative mb-4">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B572A]/40 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ingredientes..."
            className="w-full bg-[#F4EFEA]/60 border border-[#8B572A]/10 rounded-2xl py-2.5 pl-9 pr-8 text-xs font-medium text-[#1A1A1A] outline-none focus:border-[#C0392B]/40 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B572A]/40 hover:text-[#C0392B]"
            >
              <i className="fas fa-times text-xs" />
            </button>
          )}
        </div>

        <div className="space-y-4 max-h-[26rem] overflow-y-auto pr-1">
          {GROUP_ORDER.map((key) => {
            const ings = filteredGrouped[key];
            if (searchQuery && ings.length === 0) return null;
            const collapsed = collapsedGroups[key];
            const MAX_VISIBLE = 10;
            const visible = searchQuery || collapsed ? ings : ings.slice(0, MAX_VISIBLE);
            const hasMore = !searchQuery && ings.length > MAX_VISIBLE;
            const checkedCount = ings.filter((i) => selectedIds.has(i.id)).length;
            return (
              <div key={key} data-testid="pizza-ingredient-group">
                <p className="text-[10px] uppercase tracking-widest text-[#8B572A]/70 font-bold mb-2 flex items-center gap-1.5">
                  <i className={`fas ${GROUP_ICONS[key]}`} style={{ color: GROUP_COLORS[key] }} />
                  {GROUP_LABELS[key]}
                  <span className="ml-auto text-[9px] opacity-50 font-semibold">
                    {checkedCount}/{ings.length}
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {visible.map((ing) => {
                    const checked = selectedIds.has(ing.id);
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        data-testid="pizza-ingredient-chip"
                        aria-pressed={checked}
                        onClick={() => toggleIngredient(ing.id)}
                        title={ing.nombre}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                          checked
                            ? 'text-white border-transparent shadow-[0_2px_8px_rgba(192,57,43,.25)]'
                            : 'text-[#8B572A]/80 border-[#8B572A]/15 bg-[#F4EFEA]/40 hover:border-[#C0392B]/30'
                        }`}
                        style={checked ? { background: GROUP_COLORS[key] } : undefined}
                      >
                        <img src={getRealIngredientIcon(ing.id, ing.categoria)} alt="" className="w-4 h-4" />
                        {ing.nombre}
                        {ing.premium && (
                          <span className="text-[7px] font-black bg-black/15 rounded px-1 py-px">PREMIUM</span>
                        )}
                      </button>
                    );
                  })}
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => setCollapsedGroups((p) => ({ ...p, [key]: !p[key] }))}
                      className="rounded-full border border-dashed border-[#8B572A]/25 px-3 py-1.5 text-[10px] text-[#8B572A]/60 hover:border-[#C0392B]/40 hover:text-[#C0392B]"
                    >
                      {collapsed ? '▲ Mostrar menos' : `▼ ${ings.length - MAX_VISIBLE} más`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paso 3: vista + resumen */}
      <div className={`lg:col-span-4 ${cardClass}`}>
        <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1A1A] mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#C0392B] text-white text-xs flex items-center justify-center font-black">
            3
          </span>
          Tu pizza
        </h3>

        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-full max-w-[200px] mx-auto mb-4"
          style={{ aspectRatio: '1' }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_6px_18px_rgba(139,87,42,.18)]">
            <circle cx="100" cy="100" r="92" fill="#dcae73" stroke="#a67c52" strokeWidth="6" />
            <circle cx="100" cy="100" r="82" fill="#e8c48a" opacity="0.5" />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#c4955a"
              strokeWidth="4"
              strokeDasharray="4 3"
              opacity="0.4"
            />
            <g>{toppingNodes}</g>
            {selectedIds.size === 0 && (
              <text
                x="100"
                y="105"
                textAnchor="middle"
                fill="#8B572A"
                fontSize="8"
                fontWeight="700"
                letterSpacing="2"
                opacity="0.5"
              >
                SELECCIONA INGREDIENTES
              </text>
            )}
          </svg>
        </motion.div>

        <p className="text-center text-sm font-black text-[#C0392B] mb-3">
          {selectedSize
            ? `${selectedSize.nombre} — base $${selectedSize.precio.toLocaleString('es-CO')}`
            : 'Elige un tamaño'}
        </p>

        <ul data-testid="pizza-summary-list" className="space-y-1 max-h-28 overflow-y-auto mb-4 text-xs">
          {selectedNames.length === 0 ? (
            <li className="text-center text-[#8B572A]/40 italic py-2">Elige tus ingredientes</li>
          ) : (
            selectedNames.map((n) => (
              <li
                key={n}
                className="flex items-center gap-2 border-b border-dashed border-[#8B572A]/10 py-1 text-[#1A1A1A]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#C0392B] flex-shrink-0" />
                {n}
              </li>
            ))
          )}
        </ul>

        <div className="border-t border-[#8B572A]/10 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-[#8B572A]/70">
            <span>Incluidos</span>
            <span>{incluidos}</span>
          </div>
          <div className="flex justify-between text-[#8B572A]/70">
            <span>Adicionales ({extras} × $3.500)</span>
            <span>${extraTotal.toLocaleString('es-CO')}</span>
          </div>
          <div className="flex justify-between items-center border-t border-[#8B572A]/10 pt-2 mt-1">
            <span className="font-black text-[#1A1A1A]">Total</span>
            <span className="text-xl font-black text-[#C0392B]">${total.toLocaleString('es-CO')}</span>
          </div>
        </div>

        {selectedSize && (
          <p
            className={`mt-3 text-center text-[11px] font-semibold rounded-xl px-3 py-2 ${
              extras === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F9DC5C]/20 text-[#8B572A]'
            }`}
          >
            {extras === 0
              ? '✓ Todo incluido, sin costo adicional'
              : `${extras} adicional${extras !== 1 ? 'es' : ''} · $${extraTotal.toLocaleString('es-CO')}`}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={clearAll}
            className="flex-shrink-0 px-4 py-3 rounded-2xl border border-[#8B572A]/15 text-[#8B572A]/70 text-[11px] font-bold hover:border-[#C0392B]/30 transition-all"
          >
            <i className="fas fa-rotate-left" />
          </button>
          <button
            type="button"
            data-testid="pizza-add-btn"
            onClick={handleAdd}
            disabled={!selectedSize || selectedIds.size === 0}
            className="flex-1 py-3 rounded-2xl bg-[#C0392B] text-white text-xs font-black uppercase tracking-widest hover:bg-[#962D22] transition-all shadow-[0_8px_20px_rgba(192,57,43,.3)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {justAdded ? (
              <>
                <i className="fas fa-check-circle mr-2" />
                ¡Agregada!
              </>
            ) : (
              <>
                <i className="fas fa-cart-plus mr-2" />
                Agregar al pedido
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-20 text-[#8B572A]/50 font-bold text-sm">
        <i className="fas fa-spinner fa-spin mr-3" />
        Cargando armador…
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="text-center py-20 text-[#8B572A]/50 font-bold text-sm">
        No pudimos cargar el armador. Intenta de nuevo o pide por WhatsApp.
      </div>
    );
  }

  if (isModal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Arma tu pizza"
          className="w-full max-w-5xl my-8"
        >
          <div className="bg-[#F4EFEA] rounded-[28px] p-4 sm:p-6 shadow-2xl relative">
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center shadow-lg hover:bg-[#C0392B] transition-all"
            >
              <i className="fas fa-times text-xs" />
            </button>
            <h2 className="text-xl font-black text-[#1A1A1A] mb-4" style={{ fontFamily: "'Bitter', serif" }}>
              {productName || 'Arma tu pizza'}
            </h2>
            {body}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <section id="ctp-builder" className="bg-[#F4EFEA] py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p
            className="text-[11px] font-bold uppercase tracking-[3px] text-[#C0392B] mb-2"
            style={{ fontFamily: "'Bitter', serif" }}
          >
            Arma la tuya
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-[#1A1A1A] mb-3" style={{ fontFamily: "'Bitter', serif" }}>
            Crea tu Pizza
          </h2>
          <p className="text-[#8B572A]/70 max-w-md mx-auto text-sm">
            Elige el tamaño y combina ingredientes. La pizza visual se actualiza en tiempo real.
          </p>
        </div>
        {body}
      </div>
    </section>
  );
};

export default PizzaBuilder;
