import { useState } from 'react';
import {
  MenuItem,
  formatPrice,
  getProductImage,
  BEBIDAS_ADDON,
  PAPAS_ADDON,
} from '../data/menu-data';
import { useCartStore } from '../store/cartStore';

interface Props {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductAddModal({ item, isOpen, onClose }: Props) {
  const [addonPapas, setAddonPapas] = useState(false);
  const [addonBebida, setAddonBebida] = useState('');
  const [isCombo, setIsCombo] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const addItem = useCartStore((s) => s.addItem);

  if (!isOpen) return null;

  const isHamburguesa =
    item.category === 'hamburguesas' || item.category === 'hamburguesa-apanada';
  const isPerro = item.category === 'perros-calientes';
  const canAddPapas = isHamburguesa;
  const canAddBebida =
    isHamburguesa ||
    isPerro ||
    item.category === 'salchipapas' ||
    item.category === 'lasanas' ||
    item.category === 'spaguettis' ||
    item.category === 'especiales';
  const canCombo = isPerro && !!item.priceCombo;

  let basePrice = item.price;
  if (canCombo && isCombo) {
    basePrice = item.priceCombo ?? item.price;
  }

  let addonsTotal = 0;
  const addonNames: string[] = [];
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

  const unitPrice = basePrice + addonsTotal;
  const total = unitPrice * quantity;

  const detailsParts: string[] = [];
  if (canCombo && isCombo) detailsParts.push('Combo');
  detailsParts.push(...addonNames);
  const details = detailsParts.join(' + ');

  const handleAdd = () => {
    addItem({
      id: item.id,
      name: item.name,
      price: unitPrice,
      category: item.category,
      details: details || undefined,
      quantity,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative bg-crema rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-44 sm:h-52 overflow-hidden rounded-t-2xl sm:rounded-t-2xl">
          <img
            src={getProductImage(item.category, item.id)}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors text-sm"
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

        <div className="p-5 space-y-5">
          {/* Description */}
          {item.description && (
            <p className="text-carbon/60 text-sm leading-relaxed">{item.description}</p>
          )}

          {/* Perro combo toggle */}
          {canCombo && (
            <div>
              <h4 className="font-heading text-xs uppercase text-carbon/40 tracking-widest mb-3">
                Presentación
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
                    {formatPrice(item.price)}
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
                  <p className="text-[11px] text-albahaca">Papas + bebida</p>
                </button>
              </div>
            </div>
          )}

          {/* Add-ons */}
          {(canAddPapas || canAddBebida) && (
            <div>
              <h4 className="font-heading text-xs uppercase text-carbon/40 tracking-widest mb-3">
                ¿Algo más?
              </h4>
              <div className="space-y-2">
                {canAddPapas && (
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
                )}
                {canAddBebida && (
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
                )}
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
