
export enum UserRole {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  REPARTIDOR = 'REPARTIDOR'
}

export enum PizzaSize {
  PERSONAL = 'Personal',
  MEDIANA = 'Mediana',
  GRANDE = 'Grande'
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
  CANCELLED = 'CANCELLED'
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
  | 'reviews';

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
