// Iconos SVG reales para los 23 ingredientes efectivamente sembrados por
// server/seedData/juanchosMenu.js (ids `ing-<slug>`, ver su función slug()).
// Distinto del set legacy en ingredientImages.ts, que está keyeado a los ids
// falsos (carne_1, veg_7, ...) del builder "avanzado" ya removido -- ese
// mapa nunca coincidió con lo que /api/ingredients devuelve realmente.
import jamon from '../assets/images/ingredients-real/jamon.svg';
import polloDesmechado from '../assets/images/ingredients-real/pollo-desmechado.svg';
import carneDesmechada from '../assets/images/ingredients-real/carne-desmechada.svg';
import carneMolida from '../assets/images/ingredients-real/carne-molida.svg';
import salami from '../assets/images/ingredients-real/salami.svg';
import cabano from '../assets/images/ingredients-real/cabano.svg';
import costillasBbq from '../assets/images/ingredients-real/costillas-bbq.svg';
import chorizo from '../assets/images/ingredients-real/chorizo.svg';
import tocineta from '../assets/images/ingredients-real/tocineta.svg';
import champinones from '../assets/images/ingredients-real/champinones.svg';
import cebolla from '../assets/images/ingredients-real/cebolla.svg';
import maizTierno from '../assets/images/ingredients-real/maiz-tierno.svg';
import tomate from '../assets/images/ingredients-real/tomate.svg';
import cilantro from '../assets/images/ingredients-real/cilantro.svg';
import espinaca from '../assets/images/ingredients-real/espinaca.svg';
import oregano from '../assets/images/ingredients-real/oregano.svg';
import pina from '../assets/images/ingredients-real/pina.svg';
import cerezas from '../assets/images/ingredients-real/cerezas.svg';
import duraznos from '../assets/images/ingredients-real/duraznos.svg';
import uvasPasas from '../assets/images/ingredients-real/uvas-pasas.svg';
import tostacos from '../assets/images/ingredients-real/tostacos.svg';
import quesoExtra from '../assets/images/ingredients-real/queso-extra.svg';
import bocadillo from '../assets/images/ingredients-real/bocadillo.svg';
import genericoCarne from '../assets/images/ingredients-real/generico-carne.svg';
import genericoVegetal from '../assets/images/ingredients-real/generico-vegetal.svg';
import genericoFruta from '../assets/images/ingredients-real/generico-fruta.svg';
import genericoExtra from '../assets/images/ingredients-real/generico-extra.svg';

export const REAL_INGREDIENT_ICONS: Record<string, string> = {
  'ing-jamon': jamon,
  'ing-pollo-desmechado': polloDesmechado,
  'ing-carne-desmechada': carneDesmechada,
  'ing-carne-molida': carneMolida,
  'ing-salami': salami,
  'ing-cabano': cabano,
  'ing-costillas-bbq': costillasBbq,
  'ing-chorizo': chorizo,
  'ing-tocineta': tocineta,
  'ing-champinones': champinones,
  'ing-cebolla': cebolla,
  'ing-maiz-tierno': maizTierno,
  'ing-tomate': tomate,
  'ing-cilantro': cilantro,
  'ing-espinaca': espinaca,
  'ing-oregano': oregano,
  'ing-pina': pina,
  'ing-cerezas': cerezas,
  'ing-duraznos': duraznos,
  'ing-uvas-pasas': uvasPasas,
  'ing-tostacos': tostacos,
  'ing-queso-extra': quesoExtra,
  'ing-bocadillo': bocadillo,
};

const CATEGORY_FALLBACK: Record<string, string> = {
  carne: genericoCarne,
  vegetal: genericoVegetal,
  fruta: genericoFruta,
  extra: genericoExtra,
};

export const getRealIngredientIcon = (id: string, categoria?: string | null): string =>
  REAL_INGREDIENT_ICONS[id] || CATEGORY_FALLBACK[categoria || ''] || genericoExtra;
