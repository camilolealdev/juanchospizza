// ══════════════════════════════════════════════════════════════════════════
//  Pizza Builder + Vanilla Page Navigation
//  Extraído de index.html en Sprint S2 (Habeas Data + CSP). Mantiene el
//  contrato con CartContext vía window.__pizzaBuilderAddToCart (definida
//  por src/context/CartContext.tsx en el bundle React).
// ══════════════════════════════════════════════════════════════════════════

// ====== INGREDIENTS DATA ======
const INGREDIENTS = [
{id:'base_1',nombre:'Masa Artesanal',descripcion:'48h fermentación',precio_extra:0,categoria:'base',disponible:true,default:true},
{id:'base_2',nombre:'Masa Integral',descripcion:'Trigo entero',precio_extra:3000,categoria:'base',disponible:true},
{id:'base_3',nombre:'Masa Sin Gluten',descripcion:'Certificada',precio_extra:5000,categoria:'base',disponible:true},
{id:'base_4',nombre:'Masa Delgada',descripcion:'Extra crunch',precio_extra:2000,categoria:'base',disponible:true},
{id:'base_5',nombre:'Masa Espesa',descripcion:'Estilo Chicago',precio_extra:2000,categoria:'base',disponible:true},
{id:'base_6',nombre:'Masa Focaccia',descripcion:'Oliva y romero',precio_extra:4000,categoria:'base',disponible:true},
{id:'salsa_1',nombre:'Salsa Tomate Clásica',descripcion:'San Marzano',precio_extra:0,categoria:'salsa',disponible:true,default:true},
{id:'salsa_2',nombre:'Salsa César de la Casa',descripcion:'Receta especial',precio_extra:4000,categoria:'salsa',premium:true,disponible:true},
{id:'salsa_3',nombre:'Salsa BBQ',descripcion:'Ahumada',precio_extra:2000,categoria:'salsa',disponible:true},
{id:'salsa_4',nombre:'Salsa Pesto',descripcion:'Albahaca y piñones',precio_extra:3000,categoria:'salsa',disponible:true},
{id:'salsa_5',nombre:'Salsa Blanca',descripcion:'Crema premium',precio_extra:2000,categoria:'salsa',disponible:true},
{id:'salsa_6',nombre:'Salsa Picante',descripcion:'Habanero blend',precio_extra:1000,categoria:'salsa',disponible:true},
{id:'salsa_7',nombre:'Salsa Alfredo',descripcion:'Queso y crema',precio_extra:3000,categoria:'salsa',disponible:true},
{id:'salsa_8',nombre:'Salsa Arrabbiata',descripcion:'Picante suave',precio_extra:2500,categoria:'salsa',disponible:true},
{id:'salsa_9',nombre:'Salsa Puttanesca',descripcion:'Olivas y alcaparras',precio_extra:3500,categoria:'salsa',disponible:true},
{id:'salsa_10',nombre:'Salsa Boloñesa',descripcion:'Carne braseada',precio_extra:3500,categoria:'salsa',disponible:true},
{id:'salsa_11',nombre:'Aceite de Oliva',descripcion:'Extra virgen',precio_extra:1000,categoria:'salsa',disponible:true},
{id:'salsa_12',nombre:'Sin Salsa',descripcion:'Base blanca',precio_extra:0,categoria:'salsa',disponible:true},
{id:'salsa_13',nombre:'Chocolate Fundido',descripcion:'Especial dulce',precio_extra:3000,categoria:'salsa',disponible:true,dulce:true},
{id:'salsa_14',nombre:'Nutella',descripcion:'Avellana real',precio_extra:4000,categoria:'salsa',disponible:true,dulce:true},
{id:'salsa_15',nombre:'Dulce de Leche',descripcion:'Arequipe artesanal',precio_extra:2500,categoria:'salsa',disponible:true,dulce:true},
{id:'queso_1',nombre:'Mozzarella Tradicional',descripcion:'Local fresco',precio_extra:0,categoria:'queso',disponible:true,default:true},
{id:'queso_2',nombre:'Mozzarella de Búfala D.O.P.',descripcion:'Importado',precio_extra:8000,categoria:'queso',premium:true,disponible:true},
{id:'queso_3',nombre:'Parmesano Reggiano',descripcion:'24 meses',precio_extra:5000,categoria:'queso',premium:true,disponible:true},
{id:'queso_4',nombre:'Queso Gouda',descripcion:'Holandés suave',precio_extra:3000,categoria:'queso',disponible:true},
{id:'queso_5',nombre:'Queso Crema',descripcion:'Textura suave',precio_extra:2000,categoria:'queso',disponible:true},
{id:'queso_6',nombre:'Queso Azul (Gorgonzola)',descripcion:'Intenso',precio_extra:6000,categoria:'queso',disponible:true},
{id:'queso_7',nombre:'Queso Vegano',descripcion:'Base coco',precio_extra:7000,categoria:'queso',disponible:true,vegano:true},
{id:'queso_8',nombre:'Doble Queso',descripcion:'Extra mozzarella',precio_extra:3000,categoria:'queso',disponible:true},
{id:'queso_9',nombre:'Queso Feta',descripcion:'Griego auténtico',precio_extra:4000,categoria:'queso',disponible:true},
{id:'queso_10',nombre:'Queso Provolone',descripcion:'Ahumado',precio_extra:3500,categoria:'queso',disponible:true},
{id:'queso_11',nombre:'Queso Fresco',descripcion:'Campesino',precio_extra:2500,categoria:'queso',disponible:true},
{id:'queso_12',nombre:'Queso Ricotta',descripcion:'Cremoso',precio_extra:4500,categoria:'queso',disponible:true},
{id:'carne_1',nombre:'Jamón Cocido Premium',descripcion:'Magro',precio_extra:4000,categoria:'carne',disponible:true},
{id:'carne_2',nombre:'Pepperoni Importado',descripcion:'Spicy',precio_extra:5000,categoria:'carne',disponible:true},
{id:'carne_3',nombre:'Salami Ibérico',descripcion:'D.O.P',precio_extra:9000,categoria:'carne',premium:true,disponible:true},
{id:'carne_4',nombre:'Chorizo Español D.O.P.',descripcion:'Ahumado',precio_extra:8000,categoria:'carne',premium:true,disponible:true},
{id:'carne_5',nombre:'Jamón Serrano 24 Meses',descripcion:'Reserva',precio_extra:10000,categoria:'carne',premium:true,disponible:true},
{id:'carne_6',nombre:'Bresaola Curada 60 Días',descripcion:'Corte magro',precio_extra:12000,categoria:'carne',premium:true,disponible:true},
{id:'carne_7',nombre:'Tocineta Ahumada',descripcion:'Crunchy',precio_extra:5000,categoria:'carne',disponible:true},
{id:'carne_8',nombre:'Pollo BBQ',descripcion:'Pechuga',precio_extra:6000,categoria:'carne',disponible:true},
{id:'carne_9',nombre:'Jamón de Pierna',descripcion:'Tradicional',precio_extra:3000,categoria:'carne',disponible:true},
{id:'carne_10',nombre:'Prosciutto di Parma',descripcion:'Italiano',precio_extra:9500,categoria:'carne',premium:true,disponible:true},
{id:'carne_11',nombre:'Salami Picante',descripcion:'Diavola',precio_extra:5500,categoria:'carne',disponible:true},
{id:'carne_12',nombre:'Carne Molida Sazonada',descripcion:'Res',precio_extra:6000,categoria:'carne',disponible:true},
{id:'carne_13',nombre:'Pollo Asado',descripcion:'Finas hierbas',precio_extra:5500,categoria:'carne',disponible:true},
{id:'carne_14',nombre:'Salchicha Italiana',descripcion:'Hinojo',precio_extra:5000,categoria:'carne',disponible:true},
{id:'carne_15',nombre:'Mortadela',descripcion:'Corte boloña',precio_extra:4000,categoria:'carne',disponible:true},
{id:'carne_16',nombre:'Lomo de Cerdo',descripcion:'Asado',precio_extra:7000,categoria:'carne',disponible:true},
{id:'carne_17',nombre:'Atún',descripcion:'Lomo',precio_extra:4500,categoria:'carne',disponible:true},
{id:'carne_18',nombre:'Jamón de York',descripcion:'Clásico',precio_extra:3500,categoria:'carne',disponible:true},
{id:'veg_1',nombre:'Tomate Fresco',descripcion:'En rodajas',precio_extra:1000,categoria:'vegetal',disponible:true},
{id:'veg_2',nombre:'Piña Caramelizada',descripcion:'Asada',precio_extra:2000,categoria:'vegetal',disponible:true},
{id:'veg_3',nombre:'Albahaca Fresca',descripcion:'Aromática',precio_extra:1000,categoria:'vegetal',disponible:true},
{id:'veg_4',nombre:'Rúgula Fresca',descripcion:'Silvestre',precio_extra:3000,categoria:'vegetal',premium:true,disponible:true},
{id:'veg_5',nombre:'Cebolla Morada',descripcion:'Pluma',precio_extra:1000,categoria:'vegetal',disponible:true},
{id:'veg_6',nombre:'Cebolla Caramelizada',descripcion:'Dulce',precio_extra:3000,categoria:'vegetal',premium:true,disponible:true},
{id:'veg_7',nombre:'Champiñones Frescos',descripcion:'Paris',precio_extra:2000,categoria:'vegetal',disponible:true},
{id:'veg_8',nombre:'Pimientos de Colores',descripcion:'Trio',precio_extra:2000,categoria:'vegetal',disponible:true},
{id:'veg_9',nombre:'Aceitunas Negras',descripcion:'Deshuesadas',precio_extra:1000,categoria:'vegetal',disponible:true},
{id:'veg_10',nombre:'Aceitunas Verdes',descripcion:'Rellenas',precio_extra:1000,categoria:'vegetal',disponible:true},
{id:'veg_11',nombre:'Maíz Dulce',descripcion:'Granos tiernos',precio_extra:1000,categoria:'vegetal',disponible:true},
{id:'veg_12',nombre:'Alcachofas',descripcion:'Corazones',precio_extra:4000,categoria:'vegetal',disponible:true},
{id:'veg_13',nombre:'Ajo Asado',descripcion:'Suave',precio_extra:2000,categoria:'vegetal',disponible:true},
{id:'veg_14',nombre:'Aceite Trufado',descripcion:'Aroma a trufa blanca',precio_extra:7000,categoria:'especia',premium:true,disponible:true},
{id:'veg_15',nombre:'Orégano',descripcion:'Seco aromático',precio_extra:500,categoria:'especia',disponible:true,default:true},
{id:'veg_16',nombre:'Sal de Ajo Colombiana',descripcion:'Mezcla artesanal',precio_extra:1000,categoria:'especia',disponible:true},
{id:'veg_17',nombre:'Romero Fresco',descripcion:'Recién cortado',precio_extra:2000,categoria:'especia',disponible:true},
{id:'veg_18',nombre:'Espinaca',descripcion:'Hojas tiernas',precio_extra:1500,categoria:'vegetal',disponible:true},
{id:'veg_19',nombre:'Berenjena',descripcion:'Asada',precio_extra:2000,categoria:'vegetal',disponible:true},
{id:'veg_20',nombre:'Zanahoria',descripcion:'Rallada',precio_extra:1000,categoria:'vegetal',disponible:true},
{id:'veg_21',nombre:'Jalapeño',descripcion:'Picante',precio_extra:1500,categoria:'vegetal',disponible:true},
{id:'veg_22',nombre:'Pimiento Rojo',descripcion:'Dulce en tiras',precio_extra:1500,categoria:'vegetal',disponible:true},
{id:'veg_23',nombre:'Aceitunas Kalamata',descripcion:'Griegas intensas',precio_extra:2500,categoria:'vegetal',premium:true,disponible:true},
{id:'veg_24',nombre:'Tomate Cherry',descripcion:'Dulces partidos',precio_extra:2000,categoria:'vegetal',disponible:true},
{id:'veg_25',nombre:'Berro',descripcion:'Silvestre',precio_extra:2000,categoria:'vegetal',disponible:true},
{id:'veg_26',nombre:'Apio',descripcion:'Fresco picado',precio_extra:1000,categoria:'vegetal',disponible:true},
{id:'veg_27',nombre:'Cebollín',descripcion:'Finamente picado',precio_extra:1000,categoria:'vegetal',disponible:true},
{id:'veg_28',nombre:'Perejil',descripcion:'Liso fresco',precio_extra:500,categoria:'vegetal',disponible:true},
{id:'dul_1',nombre:'Fresas Frescas',descripcion:'Dulces de la sabana',precio_extra:3000,categoria:'dulce',disponible:true},
{id:'dul_2',nombre:'Banano Fresco',descripcion:'Maduro en rodajas',precio_extra:2000,categoria:'dulce',disponible:true},
{id:'dul_3',nombre:'Nueces',descripcion:'De nogal troceadas',precio_extra:2500,categoria:'dulce',disponible:true},
{id:'dul_4',nombre:'Queso Fresco Dulce',descripcion:'Campesino dulce',precio_extra:2500,categoria:'dulce',disponible:true},
{id:'dul_5',nombre:'Canela',descripcion:'En polvo',precio_extra:1000,categoria:'dulce',disponible:true},
{id:'dul_6',nombre:'Coco Rallado',descripcion:'Natural tostado',precio_extra:2000,categoria:'dulce',disponible:true},
{id:'dul_7',nombre:'Pasas',descripcion:'Sin semilla',precio_extra:1500,categoria:'dulce',disponible:true},
{id:'dul_8',nombre:'Manjar Blanco',descripcion:'Postre tradicional',precio_extra:2500,categoria:'dulce',disponible:true},
{id:'dul_9',nombre:'Tres Leches',descripcion:'Mezcla cremosa',precio_extra:3000,categoria:'dulce',disponible:true},
{id:'dul_10',nombre:'Arequipe',descripcion:'Dulce de leche',precio_extra:2500,categoria:'dulce',disponible:true},
{id:'dul_11',nombre:'Azúcar Glass',descripcion:'Pulverizada fina',precio_extra:1000,categoria:'dulce',disponible:true},
{id:'dul_12',nombre:'Mantequilla Dulce',descripcion:'Cremosa con azúcar',precio_extra:1500,categoria:'dulce',disponible:true},
{id:'dul_13',nombre:'Galletas Oreo',descripcion:'Trozos crujientes',precio_extra:3000,categoria:'dulce',disponible:true},
{id:'dul_14',nombre:'Chocolate Blanco',descripcion:'Chispas premium',precio_extra:2500,categoria:'dulce',disponible:true},
{id:'dul_15',nombre:'Mango Fresco',descripcion:'Cubos dulces',precio_extra:2500,categoria:'dulce',disponible:true},
{id:'dul_16',nombre:'Piña Fresca',descripcion:'Trozos naturales',precio_extra:2000,categoria:'dulce',disponible:true},
{id:'dul_17',nombre:'Miel',descripcion:'De abejas pura',precio_extra:1500,categoria:'dulce',disponible:true},
{id:'dul_18',nombre:'Merengue',descripcion:'Crujiente',precio_extra:2000,categoria:'dulce',disponible:true},
{id:'dul_19',nombre:'Azúcar Morena',descripcion:'Orgánica',precio_extra:1000,categoria:'dulce',disponible:true},
{id:'ext_1',nombre:'Huevo Frito',descripcion:'En el momento',precio_extra:3000,categoria:'extra',disponible:true},
{id:'ext_2',nombre:'Tocineta Extra',descripcion:'Porción adicional',precio_extra:4000,categoria:'extra',disponible:true},
{id:'ext_3',nombre:'Pepperoni Extra',descripcion:'Porción adicional',precio_extra:4000,categoria:'extra',disponible:true},
{id:'ext_4',nombre:'Queso Extra',descripcion:'Porción adicional',precio_extra:5000,categoria:'extra',disponible:true},
{id:'ext_5',nombre:'Jamón Extra',descripcion:'Porción adicional',precio_extra:3500,categoria:'extra',disponible:true},
{id:'ext_6',nombre:'Champiñones Extra',descripcion:'Porción adicional',precio_extra:2500,categoria:'extra',disponible:true},
{id:'ext_7',nombre:'Piña Extra',descripcion:'Porción adicional',precio_extra:2000,categoria:'extra',disponible:true},
{id:'ext_8',nombre:'Aceitunas Extra',descripcion:'Porción adicional',precio_extra:1500,categoria:'extra',disponible:true},
{id:'ext_9',nombre:'Cebolla Extra',descripcion:'Porción adicional',precio_extra:1500,categoria:'extra',disponible:true},
{id:'ext_10',nombre:'Orégano Extra',descripcion:'Porción adicional',precio_extra:500,categoria:'extra',disponible:true},
{id:'ext_11',nombre:'Aceite de Oliva Extra',descripcion:'Chorro adicional',precio_extra:1500,categoria:'extra',disponible:true},
{id:'ext_12',nombre:'Parmesano Extra',descripcion:'Porción adicional',precio_extra:3000,categoria:'extra',disponible:true},
{id:'ext_13',nombre:'Rúgula Extra',descripcion:'Porción adicional',precio_extra:2500,categoria:'extra',disponible:true}
];

const SIZES = ['Personal','Mediana','Grande'];
const SIZE_FACTORS = { Personal: 1.0, Mediana: 1.52, Grande: 1.80 };
const BASE_PRICE = 25000;
const CAT_ICONS = { base:'bread-slice', salsa:'droplet', queso:'cheese', carne:'drumstick-bite', vegetal:'leaf', dulce:'cookie', extra:'plus', especia:'pepper-hot' };
const CAT_LABELS = { base:'Masa', salsa:'Salsa', queso:'Queso', carne:'Carne', vegetal:'Vegetal', dulce:'Dulce', extra:'Extra' };
const CAT_COLORS = { base:'var(--marron-madera)', salsa:'rgba(192,57,43,.6)', queso:'rgba(249,220,92,.5)', carne:'#962D22', vegetal:'#6B8E23', dulce:'#db2777', extra:'#ea580c', especia:'#8B572A' };
const CAT_VIS_COLORS = { salsa:'rgba(192,57,43,.55)', queso:'rgba(249,220,92,.45)' };

// Phyllotaxis
function generateSlots(count, radiusScale) {
    radiusScale = radiusScale || 0.82;
    const slots = [];
    for (let i = 0; i < count; i++) {
        const r = Math.sqrt(i / count) * radiusScale;
        const theta = i * 137.508;
        slots.push({ x: 50 + (r * 50) * Math.cos(theta * Math.PI / 180), y: 50 + (r * 50) * Math.sin(theta * Math.PI / 180), rot: (i * 137.5) % 360, scale: 0.85 + (i % 4) * 0.05 });
    }
    return slots;
}
const MASTER_SLOTS = generateSlots(180);

// State
let currentSize = 'Mediana';
let activeSide = 'whole';
let activeCat = 'base';
let selections = { whole: [], left: [], right: [] };
let isProcessing = false;
let itemsInCart = parseInt(localStorage.getItem('juanchos_cart') || '0') || 0;
const cartCounter = document.getElementById('cartCounter');

// Advanced builder localStorage persistence
const ADV_STORAGE_KEY = 'juanchos_advanced_builder';
function saveAdvancedState() {
  try {
    const data = {
      size: currentSize,
      side: activeSide,
      cat: activeCat,
      selections: selections
    };
    localStorage.setItem(ADV_STORAGE_KEY, JSON.stringify(data));
  } catch(_e) { /* ignore */ }
}
function loadAdvancedState() {
  try {
    const raw = localStorage.getItem(ADV_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data) return false;
    if (data.size && SIZES.includes(data.size)) currentSize = data.size;
    if (data.side && ['whole','left','right'].includes(data.side)) activeSide = data.side;
    if (data.cat && ['base','salsa','queso','carne','vegetal','dulce','extra'].includes(data.cat)) activeCat = data.cat;
    if (data.selections && typeof data.selections === 'object') {
      selections = {
        whole: Array.isArray(data.selections.whole) ? data.selections.whole : [],
        left: Array.isArray(data.selections.left) ? data.selections.left : [],
        right: Array.isArray(data.selections.right) ? data.selections.right : []
      };
    }
    return true;
  } catch(_e) { return false; }
}

// Exponer para que los hooks del bundle React lo usen si está presente.
// Mantener este script al final del body (cargado con defer) o antes del
// bundle React asegura que document.getElementById('cartCounter') está.
// Named fallback function — NO uses arguments.callee (deprecated & breaks strict mode)
const __pizzaBuilderFallback = function (_name, _details) {
  itemsInCart++;
  if (cartCounter) cartCounter.textContent = itemsInCart;
  localStorage.setItem('juanchos_cart', itemsInCart.toString());
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: itemsInCart }));
};

window.__pizzaBuilderAddToCart = window.__pizzaBuilderAddToCart || __pizzaBuilderFallback;

// Helpers
function getIng(id) { return INGREDIENTS.find(i => i.id === id); }
function getCurrentMasa() {
    const all = [...selections.whole, ...selections.left, ...selections.right];
    return INGREDIENTS.find(i => i.categoria === 'base' && all.includes(i.id));
}
function calcPrice() {
    const factor = SIZE_FACTORS[currentSize];
    let total = BASE_PRICE * factor;
    function add(ids, mult) { ids.forEach(id => { const ing = getIng(id); if (ing) total += ing.precio_extra * factor * mult; }); }
    add(selections.whole, 1);
    add(selections.left, 0.5);
    add(selections.right, 0.5);
    return Math.round(total);
}

// Update UI — exposed globally for CTP advanced toggle
function render() {
    renderSizes();
    renderSides();
    renderCategories();
    renderIngredients();
    renderPizza();
    renderPrice();
    renderConfirm();
    saveAdvancedState();
}
window.__pizzaBuilderRender = render;
function renderSizes() {
    const el = document.getElementById('sizeSelector');
    if (!el) return;
    el.innerHTML = SIZES.map(s => {
        const parts = s.split(' ');
        return '<button class="size-btn' + (s === currentSize ? ' active' : '') + '" data-size="' + s + '"><span>' + parts[0] + '</span>' + (parts[1] ? '<span class="sub">' + parts[1] + '</span>' : '') + '</button>';
    }).join('');
    el.querySelectorAll('.size-btn').forEach(b => b.addEventListener('click', () => { currentSize = b.dataset.size; render(); }));
}
function renderSides() {
    const el = document.getElementById('sideSelector');
    if (!el) return;
    const tabs = [{id:'whole',l:'Toda'},{id:'left',l:'Mitad Izq'},{id:'right',l:'Mitad Der'}];
    el.innerHTML = tabs.map(t => '<button class="side-btn' + (activeSide === t.id ? ' active' : '') + '" data-side="' + t.id + '">' + t.l + '</button>').join('');
    el.querySelectorAll('.side-btn').forEach(b => b.addEventListener('click', () => { activeSide = b.dataset.side; render(); }));
}
function renderCategories() {
    const el = document.getElementById('catScroll');
    if (!el) return;
    const cats = ['base','salsa','queso','carne','vegetal','dulce','extra'];
    el.innerHTML = cats.map(c => '<button class="cat-btn' + (activeCat === c ? ' active' : '') + '" data-cat="' + c + '"><i class="fas fa-' + (CAT_ICONS[c]||'circle') + '"></i><span>' + (CAT_LABELS[c]||c) + '</span></button>').join('');
    el.querySelectorAll('.cat-btn').forEach(b => b.addEventListener('click', () => { activeCat = b.dataset.cat; render(); }));
}
function renderIngredients() {
    const el = document.getElementById('ingGrid');
    if (!el) return;
    const current = selections[activeSide];
    const ings = INGREDIENTS.filter(i => activeCat === 'extra' ? (i.categoria === 'extra' || i.categoria === 'especia') : i.categoria === activeCat);
    el.innerHTML = ings.map(ing => {
        const sel = current.includes(ing.id);
        return '<button class="ing-btn' + (sel ? ' selected' : '') + '" data-id="' + ing.id + '">' +
            '<div class="ing-icon' + (sel ? ' selected-icon' : ' default-icon') + '"><i class="fas fa-' + (CAT_ICONS[ing.categoria]||'pizza-slice') + '"></i></div>' +
            '<div class="ing-text"><div class="ing-name">' + ing.nombre + '</div><div class="ing-price' + (ing.precio_extra > 0 ? ' cost' : ' free') + '">' + (ing.precio_extra > 0 ? '+$' + ing.precio_extra.toLocaleString() : 'Incluido') + '</div></div>' +
            (sel ? '<div class="ing-check"><i class="fas fa-check-circle"></i></div>' : '') +
            '</button>';
    }).join('');
    el.querySelectorAll('.ing-btn').forEach(b => b.addEventListener('click', () => toggleIng(b.dataset.id)));
}
function toggleIng(id) {
    const current = [...selections[activeSide]];
    const ing = getIng(id);
    const isSel = current.includes(id);
    let updated;
    if (ing && (ing.categoria === 'base' || ing.categoria === 'salsa' || ing.categoria === 'queso')) {
        const others = INGREDIENTS.filter(i => i.categoria === ing.categoria && i.id !== id).map(i => i.id);
        updated = isSel ? current.filter(x => x !== id) : [...current.filter(x => !others.includes(x)), id];
    } else {
        updated = isSel ? current.filter(x => x !== id) : [...current, id];
    }
    selections = { ...selections, [activeSide]: updated };
    render();
}

function renderPizza() {
    const masa = getCurrentMasa();
    const circle = document.getElementById('pizzaCircle');
    const placeholder = document.getElementById('pizzaPlaceholder');
    const doughName = document.getElementById('doughName');
    const sauceLayer = document.getElementById('sauceLayer');
    const cheeseLayer = document.getElementById('cheeseLayer');
    const toppingsEl = document.getElementById('toppingsLayer');

    if (!circle) return;
    circle.className = 'pizza-circle' + (masa ? ' has-base' : ' no-base');
    if (placeholder) placeholder.style.display = masa ? 'none' : 'flex';
    if (doughName) doughName.textContent = masa ? masa.nombre : 'Plato Vacío';

    let sauceHTML = '';
    ['whole','left','right'].forEach(side => {
        const ing = INGREDIENTS.find(i => i.categoria === 'salsa' && selections[side].includes(i.id));
        if (!ing) return;
        sauceHTML += '<div class="pizza-layer" style="background:' + CAT_VIS_COLORS.salsa + ';border-radius:50%;position:absolute;inset:8px;' + (side !== 'whole' ? 'width:50%;' + (side === 'left' ? 'left:8px' : 'left:50%') : 'inset:8px') + ';filter:blur(16px);opacity:.6"></div>';
    });
    if (sauceLayer) {
      sauceLayer.style.display = sauceHTML ? 'block' : 'none';
      if (sauceHTML) sauceLayer.innerHTML = sauceHTML;
    }

    let cheeseHTML = '';
    ['whole','left','right'].forEach(side => {
        const ing = INGREDIENTS.find(i => i.categoria === 'queso' && selections[side].includes(i.id));
        if (!ing) return;
        cheeseHTML += '<div class="pizza-layer" style="background:' + CAT_VIS_COLORS.queso + ';border-radius:50%;position:absolute;inset:16px;' + (side !== 'whole' ? 'width:50%;' + (side === 'left' ? 'left:16px' : 'left:50%') : 'inset:16px') + ';filter:blur(12px);opacity:.4"></div>';
    });
    if (cheeseLayer) {
      cheeseLayer.style.display = cheeseHTML ? 'block' : 'none';
      if (cheeseHTML) cheeseLayer.innerHTML = cheeseHTML;
    }

    function renderSide(side, clipPath) {
        const ids = selections[side];
        let html = '';
        ids.forEach((id, ingIdx) => {
            const ing = getIng(id);
            if (!ing || ing.categoria === 'base' || ing.categoria === 'salsa' || ing.categoria === 'queso') return;
            const count = ing.categoria === 'carne' ? 8 : (ing.categoria === 'vegetal' ? 12 : 10);
            const seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            const start = (seed + ingIdx * 15) % (MASTER_SLOTS.length - count);
            const slots = MASTER_SLOTS.slice(start, start + count);
            slots.forEach((slot) => {
                if (clipPath === 'left' && slot.x > 50) return;
                if (clipPath === 'right' && slot.x < 50) return;
                html += '<div class="topping-dot" style="left:' + slot.x + '%;top:' + slot.y + '%;transform:translate(-50%,-50%) rotate(' + slot.rot + 'deg) scale(' + slot.scale + ');z-index:' + (40 + ingIdx) + ';background:' + (CAT_COLORS[ing.categoria] || '#444') + '"><i class="fas fa-' + (CAT_ICONS[ing.categoria]||'pizza-slice') + '"></i></div>';
            });
        });
        return html;
    }

    let topHTML = '';
    topHTML += '<div style="position:absolute;inset:0">' + renderSide('whole', null) + '</div>';
    topHTML += '<div style="position:absolute;inset:0;clip-path:polygon(0 0,50% 0,50% 100%,0 100%)">' + renderSide('left', 'left') + '</div>';
    topHTML += '<div style="position:absolute;inset:0;clip-path:polygon(50% 0,100% 0,100% 100%,50% 100%)">' + renderSide('right', 'right') + '</div>';
    if (toppingsEl) toppingsEl.innerHTML = topHTML;
}

function renderPrice() {
    const display = document.getElementById('priceDisplay');
    if (display) display.textContent = '$' + calcPrice().toLocaleString();
}
function renderConfirm() {
    const btn = document.getElementById('confirmBtn');
    if (!btn) return;
    const masa = getCurrentMasa();
    if (isProcessing) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Enviando a Cocina...';
        return;
    }
    if (!masa) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-fire-flame-curved"></i> Selecciona una Masa';
        return;
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-fire-flame-curved"></i> Confirmar Creación';
}

// Confirm button -- si CartContext montó primero, window.__pizzaBuilderAddToCart es el real;
// si no, caemos al fallback localStorage que acumulaba itemsInCart.
const confirmBtn = document.getElementById('confirmBtn');
if (confirmBtn) {
  confirmBtn.addEventListener('click', function() {
    const masa = getCurrentMasa();
    if (!masa || isProcessing) return;
    isProcessing = true;
    renderConfirm();

    const overlay = document.getElementById('builderOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.innerHTML = `
        <div style="position:relative">
            <svg class="spinner-svg" viewBox="0 0 100 100">
                <defs><linearGradient id="pizzaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#C0392B;stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:#962D22;stop-opacity:1"/>
                </linearGradient></defs>
                <circle cx="50" cy="50" r="48" fill="none" stroke="url(#pizzaGrad)" stroke-width=".5" stroke-dasharray="4 2"/>
                <circle cx="50" cy="50" r="42" fill="#F4EFEA" stroke="#8B572A" stroke-width="2"/>
                <path d="M50 8 A42 42 0 0 1 92 50 L50 50 Z" fill="#C0392B" opacity=".9"/>
                <path d="M50 50 L10 50 A42 42 0 0 1 50 8 Z" fill="#962D22" opacity=".7"/>
                <path d="M50 50 L92 50 A42 42 0 0 1 50 92 Z" fill="#a93226" opacity=".8"/>
                <circle cx="70" cy="35" r="4" fill="#7c2d12"/><circle cx="35" cy="75" r="5" fill="#7c2d12"/><circle cx="25" cy="40" r="3" fill="#7c2d12"/>
            </svg>
            <div class="pulse-dot"></div>
        </div>
        <h3 class="overlay-title">Horneando tu Obra...</h3>
        <p class="overlay-sub">Sincronizando con Cocina</p>
    `;
    }

    setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
        isProcessing = false;

        // Build ingredient details string from all selections
        const allSelectedIds = [...selections.whole, ...selections.left, ...selections.right];
        const selectedNames = allSelectedIds
          .map(id => { const ing = getIng(id); return ing ? ing.nombre : null; })
          .filter(Boolean);
        const details = selectedNames.length > 0
          ? 'Pizza artesanal · ' + (masa ? masa.nombre + ' · ' : '') + selectedNames.join(', ')
          : 'Pizza artesanal · ' + (masa ? masa.nombre : 'Personalizada');

        // Call into CartContext (React) if mounted, otherwise local fallback.
        // Check via named reference instead of arguments.callee (deprecated).
        if (window.__pizzaBuilderAddToCart !== __pizzaBuilderFallback) {
            window.__pizzaBuilderAddToCart('Pizza Personalizada', details);
        } else {
            itemsInCart++;
            if (cartCounter) cartCounter.textContent = itemsInCart;
            localStorage.setItem('juanchos_cart', itemsInCart.toString());
        }

        // Also store the ingredients array in localStorage so CTP builder can read them
        try {
          localStorage.setItem('juanchos_last_pizza_ingredients', JSON.stringify(selectedNames));
        } catch(_e) { /* ignore */ }

        const scOverlay = document.getElementById('successOverlay');
        if (scOverlay) {
          scOverlay.style.display = 'flex';
          scOverlay.innerHTML = `
            <div class="success-icon"><i class="fas fa-check"></i></div>
            <h3 class="success-title">¡Proceso Correcto!</h3>
            <p class="success-text">Tu obra maestra ha sido recibida en cocina. Pronto disfrutarás de la mejor pizza artesanal, hecha a tu medida.</p>
            <button class="success-continue" id="continueBtn">Continuar Navegando</button>
        `;
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) {
          continueBtn.addEventListener('click', () => {
              scOverlay.style.display = 'none';
              selections = { whole: [], left: [], right: [] };
              // Clear saved state after successful order
              try { localStorage.removeItem(ADV_STORAGE_KEY); } catch (_e) { /* noop - error swallowed intentionally */ }
              render();
          });
        }
        }
    }, 2800);
  });
}

// Page navigation (vanilla). No choca con React porque #root no muestra
// /menu /crea-tu-pizza /domicilios /carrito -- esos los renderizan los
// portals createPortal en App.tsx.
const PAGE_PATHS = {
    'inicio': '/',
    'crea-tu-pizza': '/crea-tu-pizza',
    'menu': '/menu',
    'domicilios': '/domicilios',
    'carrito': '/carrito',
};
const PATH_TO_PAGE = { '/': 'inicio', '/crea-tu-pizza': 'crea-tu-pizza', '/menu': 'menu', '/domicilios': 'domicilios', '/carrito': 'carrito' };

function showPage(pageId, skipPushState) {
    document.querySelectorAll('.page-container').forEach(function(el) {
        el.classList.remove('active');
    });
    var page = document.querySelector('.page-container[data-page="' + pageId + '"]');
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-links a[data-nav-page]').forEach(function(a) {
        a.style.color = '';
        a.style.fontWeight = '';
    });
    var activeLink = document.querySelector('.nav-links a[data-nav-page="' + pageId + '"]');
    if (activeLink) {
        activeLink.style.color = 'var(--amarillo-calido)';
        activeLink.style.fontWeight = '700';
    }
    if (!skipPushState && PAGE_PATHS[pageId] && window.location.pathname !== PAGE_PATHS[pageId]) {
        history.pushState({ page: pageId }, '', PAGE_PATHS[pageId]);
    }
}

window.addEventListener('popstate', function() {
    var target = PATH_TO_PAGE[window.location.pathname];
    if (target) showPage(target, true);
});

// Navegación delegada -- reemplaza los onclick="" inline que index.html tenía
// antes (logo, nav links, botón carrito, CTA del hero). CSP en producción no
// permite 'unsafe-inline' en script-src, así que esos atributos quedaban
// bloqueados en silencio; data-nav-page + un solo listener delegado cubre
// los mismos 8 elementos sin necesitar nonce/hash.
document.addEventListener('click', function(e) {
  const target = e.target.closest('[data-nav-page]');
  if (!target) return;
  e.preventDefault();
  showPage(target.dataset.navPage);
});

const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const headerEl = document.querySelector('header');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => navMenu.classList.toggle('active'));
    document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => navMenu.classList.remove('active')));
}

if (headerEl) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) headerEl.classList.add('scrolled');
        else headerEl.classList.remove('scrolled');
    });
}

window.addEventListener('cart-updated', function(e) {
    if (cartCounter) cartCounter.textContent = e.detail.toString();
});

(function initialPage() {
    var initial = PATH_TO_PAGE[window.location.pathname];
    showPage(initial || 'inicio', true);
})();
if (cartCounter) cartCounter.textContent = itemsInCart;
// Restore advanced builder state from localStorage
loadAdvancedState();
render();
