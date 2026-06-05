
export enum UserRole {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  REPARTIDOR = 'REPARTIDOR',
  MARKETING = 'MARKETING'
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
  address: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  estimatedTime: number;
  paymentMethod: 'cash' | 'card' | 'nequi' | 'daviplata' | 'pse';
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
