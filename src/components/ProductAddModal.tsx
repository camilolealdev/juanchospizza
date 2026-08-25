import { useState, useEffect } from 'react';
import {
  MenuItem,
  formatPrice,
  getProductImage,
  BEBIDAS_ADDON,
  PAPAS_ADDON,
  COMBO_GASEOSAS,
} from '../data/menu-data';
import { useCartStore } from '../store/cartStore';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { lockBodyScroll, unlockBodyScroll } from '../utils/useBodyScrollLock';

interface Props {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

export default function ProductAddModal({ item, isOpen, onClose, onAdded }: Props) {
  const [addonPapas, setAddonPapas] = useState(false);
  const [addonBebida, setAddonBebida] = useState('');
  const [isCombo, setIsCombo] = useState(false);
  const [comboBebida, setComboBebida] = useState('combo-gaseosa-500');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!isOpen) {
      setAddonPapas(false);
      setAddonBebida('');
      setIsCombo(false);
      setComboBebida('combo-gaseosa-500');
      setSelectedVariantIdx(0);
      setQuantity(1);
      setNotes('');
    }
  }, [isOpen]);

  useFocusTrap(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasVariants = item.variants && item.variants.length > 0;
  const canCombo = !!item.priceCombo;

  // Base price: variant > combo > default
  let basePrice = item.price;
  if (hasVariants) {
    basePrice = item.variants![selectedVariantIdx].price;
  } else if (canCombo && isCombo) {
    basePrice = item.priceCombo ?? item.price;
  }

  // Combo extra cost (selected gaseosa upgrade if any)
  let comboExtra = 0;
  if (canCombo && isCombo) {
    const selected = COMBO_GASEOSAS.find((g) => g.id === comboBebida);
    comboExtra = selected?.price ?? 0;
  }

  // Individual add-ons (only when combo is OFF)
  let addonsTotal = 0;
  const addonNames: string[] = [];
  if (!isCombo) {
    if (addonPapas) {
      addonsTotal += PAPAS_ADDON.price;
      addonNames.push(PAPAS_ADDON.name);
    }
    if (addonBebida) {
      const b = BEBIDAS_ADDON.find((x) => x.id === addonBebida);
      if (b) {
        addonsTotal += b.price;
        addonNames.push(b.name);
      }
    }
  }

  const unitPrice = basePrice + comboExtra + addonsTotal;
  const total = unitPrice * quantity;

  const detailsParts: string[] = [];
  if (hasVariants) detailsParts.push(item.variants![selectedVariantIdx].label);
  if (canCombo && isCombo) {
    detailsParts.push('Combo (Papas + Bebida)');
    const sel = COMBO_GASEOSAS.find((g) => g.id === comboBebida);
    if (sel && sel.price === 0) detailsParts.push(sel.name);
    else if (sel) detailsParts.push(`+ ${sel.name}`);
  }
  detailsParts.push(...addonNames);
  const details = detailsParts.join(' + ');

  const handleAdd = () => {
    const cartId = hasVariants
      ? `${item.id}-${item.variants![selectedVariantIdx].label.toLowerCase()}`
      : isCombo
        ? `${item.id}-combo`
        : item.id;
    addItem({
      id: cartId,
      name: item.name,
      price: unitPrice,
      category: item.category,
      details: details || undefined,
      quantity,
      notes: notes.trim() || undefined,
    });
    onAdded?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative bg-crema rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] sm:max-h-[92vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-40 sm:h-44 md:h-52 overflow-hidden rounded-t-2xl sm:rounded-t-2xl">
          <img
            src={getProductImage(item.category, item.id)}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors text-sm"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-heading text-2xl sm:text-3xl text-white drop-shadow-lg">
              {item.name}
            </h3>
            <p className="font-heading text-lg text-queso drop-shadow mt-0.5">
              {formatPrice(item.price)}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Description */}
          {item.description && (
            <p className="text-carbon/60 text-sm leading-relaxed">{item.description}</p>
          )}

          {/* Variant selector (Fresas Biscolatta, Cono Fresas, etc.) */}
          {hasVariants && (
            <div>
              <h4 className="font-heading text-xs uppercase text-carbon/40 tracking-widest mb-3">
                Tamaño
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {item.variants!.map((v, i) => (
                  <button
                    key={v.label}
                    onClick={() => setSelectedVariantIdx(i)}
                    className={`rounded-xl p-3 text-left border-2 transition-all ${
                      selectedVariantIdx === i
                        ? 'border-tomato bg-tomato/5 shadow-sm'
                        : 'border-carbon/10 hover:border-carbon/20'
                    }`}
                  >
                    <span className="font-heading text-sm text-carbon">{v.label}</span>
                    <p className="font-heading text-sm text-tomato mt-0.5">
                      {formatPrice(v.price)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Combo toggle */}
          {canCombo && (
            <div>
              <h4 className="font-heading text-xs uppercase text-carbon/40 tracking-widest mb-3">
                ¿Armamos combo?
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsCombo(false)}
                  className={`rounded-xl p-3 text-left border-2 transition-all ${
                    !isCombo
                      ? 'border-tomato bg-tomato/5 shadow-sm'
                      : 'border-carbon/10 hover:border-carbon/20'
                  }`}
                >
                  <span className="font-heading text-sm text-carbon">Individual</span>
                  <p className="font-heading text-sm text-tomato mt-0.5">
                    {formatPrice(hasVariants ? item.variants![selectedVariantIdx].price : item.price)}
                  </p>
                </button>
                <button
                  onClick={() => setIsCombo(true)}
                  className={`rounded-xl p-3 text-left border-2 transition-all ${
                    isCombo
                      ? 'border-tomato bg-tomato/5 shadow-sm'
                      : 'border-carbon/10 hover:border-carbon/20'
                  }`}
                >
                  <span className="font-heading text-sm text-carbon">Combo</span>
                  <p className="font-heading text-sm text-tomato mt-0.5">
                    {formatPrice(item.priceCombo ?? item.price)}
                  </p>
                  <p className="text-xs text-albahaca">Papas + Bebida</p>
                </button>
              </div>
            </div>
          )}

          {/* Combo gaseosa selector — only when combo is ON */}
          {canCombo && isCombo && (
            <div>
              <h4 className="font-heading text-xs uppercase text-carbon/40 tracking-widest mb-3">
                Tu bebida en el combo
              </h4>
              <div className="space-y-1">
                {COMBO_GASEOSAS.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-carbon/10 hover:bg-white cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="combo-bebida"
                      checked={comboBebida === g.id}
                      onChange={() => setComboBebida(g.id)}
                      className="w-4 h-4 accent-tomato flex-shrink-0"
                    />
                    <span className="text-sm text-carbon flex-1">{g.name}</span>
                    {g.price === 0 ? (
                      <span className="text-xs text-albahaca font-medium">Incluida</span>
                    ) : (
                      <span className="text-xs text-carbon/50">+{formatPrice(g.price)}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Individual add-ons — only when combo is OFF */}
          {!isCombo && (
            <div>
              <h4 className="font-heading text-xs uppercase text-carbon/40 tracking-widest mb-3">
                ¿Algo más?
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-carbon/10 hover:bg-white cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={addonPapas}
                    onChange={(e) => setAddonPapas(e.target.checked)}
                    className="w-5 h-5 rounded accent-tomato flex-shrink-0"
                  />
                  <span className="text-sm text-carbon flex-1">🍟 Papas Fritas</span>
                  <span className="text-sm font-heading text-carbon/50">
                    {formatPrice(PAPAS_ADDON.price)}
                  </span>
                </label>
                <div className="p-3 rounded-xl border border-carbon/10">
                  <p className="text-sm text-carbon font-medium mb-2">🥤 Bebida</p>
                  <div className="space-y-1">
                    {BEBIDAS_ADDON.map((bebida) => (
                      <label
                        key={bebida.id}
                        className="flex items-center gap-3 py-1.5 px-1 rounded-lg cursor-pointer hover:bg-white transition-colors"
                      >
                        <input
                          type="radio"
                          name="addon-bebida"
                          checked={addonBebida === bebida.id}
                          onChange={() =>
                            setAddonBebida(addonBebida === bebida.id ? '' : bebida.id)
                          }
                          className="w-4 h-4 accent-tomato flex-shrink-0"
                        />
                        <span className="text-sm text-carbon flex-1">{bebida.name}</span>
                        <span className="text-xs text-carbon/50">{formatPrice(bebida.price)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <h4 className="font-heading text-xs uppercase text-carbon/40 tracking-widest mb-3">
              Cantidad
            </h4>
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-11 h-11 rounded-full bg-carbon/10 text-carbon font-bold text-xl flex items-center justify-center hover:bg-carbon/20 transition-colors disabled:opacity-30"
              >
                −
              </button>
              <span className="font-heading text-3xl text-carbon w-12 text-center tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-11 h-11 rounded-full bg-carbon/10 text-carbon font-bold text-xl flex items-center justify-center hover:bg-carbon/20 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h4 className="font-heading text-xs uppercase text-carbon/40 tracking-widest mb-2">
              Notas <span className="normal-case">(opcional)</span>
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin cebolla, extra queso, sin picante..."
              className="w-full rounded-xl border border-carbon/10 bg-white px-4 py-3 text-sm text-carbon placeholder:text-carbon/30 outline-none focus:border-tomato resize-none transition-colors"
              rows={2}
            />
          </div>

          {/* CTA */}
          <button
            onClick={handleAdd}
            className="w-full bg-tomato text-white font-heading text-lg uppercase tracking-wider py-4 rounded-xl hover:bg-tomato-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-tomato/20"
          >
            Agregar{quantity > 1 ? ` ×${quantity}` : ''} — {formatPrice(total)}
          </button>
        </div>
      </div>
    </div>
  );
}
