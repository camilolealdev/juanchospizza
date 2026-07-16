export enum UserRole {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  REPARTIDOR = 'REPARTIDOR',
  MARKETING = 'MARKETING',
}

export enum PizzaSize {
  PERSONAL = 'Personal',
  MEDIANA = 'Mediana',
  GRANDE = 'Grande',
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

export interface Ingredient {
  id: string;
  nombre: string;
  descripcion: string;
  precio_extra: number;
  categoria: 'base' | 'salsa' | 'queso' | 'carne' | 'vegetal' | 'dulce' | 'extra' | 'especia';
  vegetariano?: boolean;
  vegano?: boolean;
  premium?: boolean;
  dulce?: boolean;
  default?: boolean;
  disponible: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  nombre: string;
  descripcion: string;
  basePrice: number;
  precio_personal?: number;
  precio_grande?: number;
  image: string;
  type: 'tradicional' | 'premium' | 'dulce' | 'entrada' | 'postre' | 'bebida' | 'combo' | 'salsa_mojada';
  porcion?: string;
  tiempo?: number;
  calorias?: number;
  vegetariano?: boolean;
  vegano?: boolean;
  popularidad?: number;
  exclusiva?: boolean;
  isPremium?: boolean;
  origen?: string;
  contenido?: string[];
  ahorro?: number;
  descuento?: string;
  personas?: number;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  ASSIGNED = 'ASSIGNED',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  size: PizzaSize;
  quantity: number;
  price: number;
  details?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  details?: string;
}

// Las 2 sedes físicas del negocio -- ver server/schemas/orders.js LOCATION_IDS.
export type LocationId = 'nemocon' | 'zipaquira';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone?: string;
  address: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  estimatedTime: number;
  paymentMethod: 'cash' | 'card' | 'nequi' | 'daviplata' | 'pse' | 'mercadopago' | 'paypal' | 'wompi' | 'bold';
  locationId?: LocationId;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'flash' | 'segment' | 'rappipromo';
  discount: number;
  status: 'active' | 'scheduled' | 'draft';
  reach: number;
  conversions: number;
  budget: number;
}

// ===================== GASTROPRO CRM TYPES =====================

export type GastroModule =
  | 'dashboard'
  | 'menu'
  | 'inventario'
  | 'clientes'
  | 'fidelizacion'
  | 'campanas'
  | 'finanzas'
  | 'reportes'
  | 'reviews'
  | 'pagos'
  | 'empleados'
  | 'turnos'
  | 'mesas'
  | 'caja'
  | 'comandas'
  | 'compras'
  | 'facturacion'
  | 'digiturno';

export interface Client {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
  notas?: string;
  totalCompras: number;
  totalGastado: number;
  frecuenciaCompra: number;
  ultimaCompra: string;
  creado: string;
  vip: boolean;
  puntos: number;
  nivel: string;
  tags: string[];
  estado: 'activo' | 'inactivo' | 'perdido';
  cumpleanos?: string;
}

// Staff roster -- server/auth.js logs in against this table directly (see
// EMPLOYEE_COLUMNS in server/routes/employees.js). username/isSuperAdmin come
// back from the API but are read-only from the client: isSuperAdmin is a
// DB-only flag (not accepted by create/update schemas, see
// server/schemas/employees.js), and password is set only via the dedicated
// PATCH /api/employees/:id/password route.
export interface Employee {
  id: string;
  nombre: string;
  role: 'ADMIN' | 'OPERATOR' | 'REPARTIDOR' | 'MARKETING';
  locationId: 'nemocon' | 'zipaquira' | null;
  activo: boolean;
  creado: string;
  username: string | null;
  isSuperAdmin: boolean;
}

// Turno de caja -- ver server/routes/shifts.js. expectedCash/difference son
// null mientras el turno sigue 'open'; se calculan recién al cerrarlo.
// Dining table in the restaurant floor
// Ver server/schemas/tables.js para valores válidos de area/status.
export interface DiningTable {
  id: string;
  name: string;
  capacity: number;
  area: 'salon' | 'terraza' | 'privado' | 'barra';
  locationId: LocationId;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  notes: string | null;
  qrCode: string | null;
  active: boolean;
  createdAt: string;
}

// Floor plan grouped by area
export interface FloorPlan {
  locationId: string;
  total: number;
  available: number;
  occupied: number;
  floorPlan: {
    salon: DiningTable[];
    terraza: DiningTable[];
    privado: DiningTable[];
    barra: DiningTable[];
  };
}

// VER server/db.js: cash_register table. openedBy/closedBy son nombres de
// empleado (admin/cocina/etc.), no IDs internos -- el login es vía PIN, no
// hay sesión de usuario real que inyecte un userId.
export interface CashRegisterEntry {
  id: string;
  locationId: LocationId;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  initialAmount: number;
  expectedAmount: number;
  finalAmount: number | null;
  difference: number | null;
  status: 'open' | 'closed';
  notes: string | null;
}

export interface Tip {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  waiterName: string | null;
  locationId: LocationId;
  createdAt: string;
}

export interface Comanda {
  id: string;
  tableId: string;
  waiterName: string | null;
  guestCount: number;
  notes: string | null;
  total: number;
  status: 'open' | 'closed' | 'cancelled';
  openedAt: string;
  closedAt: string | null;
  locationId: LocationId;
  items?: ComandaItem[];
}

export interface ComandaItem {
  id: string;
  comandaId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  proveedor: string;
  fechaSolicitud: string;
  fechaEntrega: string | null;
  items: PurchaseOrderItem[];
  total: number;
  status: 'pendiente' | 'aprobada' | 'enviada' | 'recibida' | 'cancelada';
  notas: string | null;
  createdBy: string | null;
  locationId: LocationId;
}

export interface PurchaseOrderItem {
  itemId?: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
}

export interface InvoiceEmisorInfo {
  nit: string;
  digitoVerificacion: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  ciudad: string;
  codigoCiudad: string;
  departamento: string;
  codigoDepartamento: string;
  pais: string;
  codigoPais: string;
  telefono: string;
  email: string;
  regimenFiscal: string;
  responsabilidadFiscal: string;
  tipoContribuyente: string;
  matriculaMercantil: string | null;
  codigoEstablecimiento: string;
}

export interface InvoiceReceptorInfo {
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  digitoVerificacion: string;
  razonSocial: string;
  direccion: string;
  ciudad: string;
  codigoCiudad: string;
  departamento: string;
  codigoDepartamento: string;
  pais: string;
  codigoPais: string;
  email: string | null;
  telefono: string | null;
}

export interface Invoice {
  id: string;
  orderId: string | null;
  invoiceNumber: string | null;
  tipoDocumento: 'factura' | 'pos' | 'pos_electronica' | 'documento_soporte';
  cufe: string | null;
  xml: string | null;
  pdf_url: string | null;
  status: 'pending' | 'sent' | 'accepted' | 'rejected';
  dianResponse: Record<string, unknown> | null;
  emisorInfo: InvoiceEmisorInfo | null;
  receptorInfo: InvoiceReceptorInfo | null;
  notes: string | null;
  fechaVencimiento: string | null;
  tipoOperacion: string;
  moneda: string;
  createdAt: string;
  locationId: LocationId;
}

export interface CreditNote {
  id: string;
  invoiceId: string;
  tipoNota: 'credito' | 'debito';
  motivo: string;
  monto: number;
  items: unknown[];
  status: string;
  xml: string | null;
  cude: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface QrMenuConfig {
  id: string;
  locationId: LocationId;
  title: string;
  showPrices: boolean;
  showImages: boolean;
  showCombos: boolean;
  showPromotions: boolean;
  categories: string[];
  active: boolean;
  updatedAt: string;
}

// ===== DIGITURNO (Turno digital para pedidos en local) =====
export interface DigiturnoTicket {
  id: string;
  ticketNumber: number;
  orderType: 'dine-in' | 'pickup';
  status: 'waiting' | 'preparing' | 'ready' | 'served' | 'cancelled';
  locationId: LocationId;
  tableId: string | null;
  tableName: string | null;
  customerName: string | null;
  guestCount: number;
  source: 'mesa' | 'local' | 'pickup';
  items: string[];
  total: number;
  notes: string | null;
  createdAt: string;
  calledAt: string | null;
  completedAt: string | null;
}

export interface Shift {
  id: string;
  locationId: LocationId;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  notas: string | null;
  status: 'open' | 'closed';
}

export interface LoyaltyLevel {
  id: string;
  nombre: string;
  puntosMinimos: number;
  descuento: number;
  color: string;
  icono: string;
  beneficios: string[];
}

export interface LoyaltyReward {
  id: string;
  nombre: string;
  descripcion: string;
  puntosCosto: number;
  tipo: 'cupon' | 'producto' | 'descuento' | 'envio';
  valor: number;
  vigente: boolean;
}

export interface LoyaltyChallenge {
  id: string;
  nombre: string;
  descripcion: string;
  objetivo: number;
  progreso: number;
  recompensa: string;
  inicia: string;
  termina: string;
  activo: boolean;
}

export interface InventoryItem {
  id: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  unidad: string;
  costoUnitario: number;
  proveedor?: string;
  lote?: string;
  fechaVencimiento?: string;
  ubicacion?: string;
  activo: boolean;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'merma';
  cantidad: number;
  saldoAnterior: number;
  saldoNuevo: number;
  motivo: string;
  referencia?: string;
  creado: string;
  usuario: string;
}

export interface Recipe {
  id: string;
  nombre: string;
  productoId: string;
  porciones: number;
  ingredientes: RecipeIngredient[];
  costoTotal: number;
  instrucciones?: string;
}

export interface RecipeIngredient {
  itemId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  costo: number;
}

export interface Expense {
  id: string;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
  metodo: string;
  proveedor?: string;
  factura?: string;
  notas?: string;
  recurrente: boolean;
}

export interface CashFlow {
  fecha: string;
  ingresos: number;
  egresos: number;
  saldo: number;
}

export interface ReportFilter {
  desde: string;
  hasta: string;
  tipo: string;
  agrupacion: 'dia' | 'semana' | 'mes';
}

export interface MenuVariant {
  id: string;
  productoId: string;
  nombre: string;
  precioModificador: number;
  activo: boolean;
}

export interface Combo {
  id: string;
  nombre: string;
  descripcion: string;
  productos: { productoId: string; cantidad: number }[];
  precioTotal: number;
  ahorro: number;
  imagen?: string;
  activo: boolean;
  horarios?: number[];
}

export interface Promotion {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'porcentaje' | 'fijo' | 'compre_lleve' | 'envio_gratis';
  valor: number;
  productoId?: string;
  categoriaId?: string;
  montoMinimo?: number;
  inicia: string;
  termina: string;
  horarios?: number[];
  activo: boolean;
  usado: number;
  limite: number;
}
