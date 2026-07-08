
import type { Order, Campaign, OrderStatus, Client, LoyaltyReward, Product, Category } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type OrderPayload = Partial<Order>;
type ClientPayload = Partial<Client>;
type LoyaltyRewardPayload = Partial<LoyaltyReward>;
type ProductPayload = Partial<Product>;

export interface MenuVariant {
  id: string;
  productoId: string | null;
  nombre: string;
  precioModificador: number;
  activo: boolean;
}
type MenuVariantPayload = Partial<MenuVariant>;

export interface MenuCombo {
  id: string;
  nombre: string;
  descripcion: string | null;
  productos: string[];
  precioTotal: number;
  ahorro: number;
  imagen: string | null;
  activo: boolean;
}
type MenuComboPayload = Partial<MenuCombo>;

export interface MenuPromotion {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string | null;
  valor: number;
  productoId: string | null;
  categoriaId: string | null;
  montoMinimo: number;
  inicia: string | null;
  termina: string | null;
  activo: boolean;
  usado: number;
  limite: number;
}
type MenuPromotionPayload = Partial<MenuPromotion>;

export interface Expense {
  id: string;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
  metodo: string;
  proveedor: string;
  factura: string;
  notas?: string;
  recurrente?: boolean;
}
type ExpensePayload = Partial<Expense>;

export interface FinanceSummary {
  ingresos: number;
  egresos: number;
  utilidad: number;
  totalOrdenes: number;
  totalClientes: number;
  gastosPorCategoria: { categoria: string; total: number }[];
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
}
type InventoryItemPayload = Partial<InventoryItem>;

export interface InventoryMovement {
  id: string;
  itemId: string;
  tipo: string;
  cantidad: number;
  saldoAnterior: number;
  saldoNuevo: number;
  motivo: string;
  referencia?: string;
  creado: string;
  usuario: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  itemId: string | null;
  nombre: string;
  cantidad: number;
  unidad: string;
  costo: number;
}

export interface Recipe {
  id: string;
  nombre: string;
  productoId: string | null;
  porciones: number;
  costoTotal: number;
  instrucciones: string | null;
  ingredientes: RecipeIngredient[];
}

export interface Review {
  id: string;
  orderId: string;
  clientPhone: string | null;
  clientName: string | null;
  rating: number;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}
type ReviewPayload = { orderId: string; clientPhone?: string; clientName?: string; rating: number; comment?: string };

// ---- Auth/session storage helpers ----
// Shared so every request can automatically attach the bearer token without
// repeating the header logic at each call site.
const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'auth_role';
const USERNAME_KEY = 'auth_username';

// Dispatched on window whenever a request comes back 401, so any part of the
// app (e.g. App.tsx) can react by logging the user out / showing the login screen.
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getStoredRole = (): string | null => {
  try {
    return localStorage.getItem(ROLE_KEY);
  } catch {
    return null;
  }
};

export const getStoredUsername = (): string | null => {
  try {
    return localStorage.getItem(USERNAME_KEY);
  } catch {
    return null;
  }
};

export const setAuthSession = (session: { token: string; role?: string; username?: string }): void => {
  try {
    localStorage.setItem(TOKEN_KEY, session.token);
    if (session.role) localStorage.setItem(ROLE_KEY, session.role);
    if (session.username) localStorage.setItem(USERNAME_KEY, session.username);
  } catch {
    // localStorage unavailable (e.g. private mode) - fail silently, session just won't persist
  }
};

export const clearAuthSession = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USERNAME_KEY);
  } catch {
    // ignore
  }
};

const authHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      }
    }
    const error = await response.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || 'Error en la solicitud');
  }
  return response.json();
};

// Central fetch wrapper: merges the bearer token (when present) and any
// caller-supplied headers, then runs the response through handleResponse.
const apiFetch = (path: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(options.headers as Record<string, string> | undefined)
  };
  return fetch(`${API_BASE}${path}`, { ...options, headers }).then(handleResponse);
};

export const api = {
  // Auth
  async login(username: string, pin: string) {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin })
    });
  },

  async refreshToken(token: string) {
    return apiFetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
  },

  // Health
  async health() {
    return apiFetch('/api/health');
  },

  // Products
  async getProducts(category?: string) {
    const path = category ? `/api/products?category=${category}` : '/api/products';
    return apiFetch(path);
  },

  async getProduct(id: string) {
    return apiFetch(`/api/products/${id}`);
  },

  async createProduct(product: ProductPayload) {
    return apiFetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
  },

  async updateProduct(id: string, data: ProductPayload) {
    return apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteProduct(id: string) {
    return apiFetch(`/api/products/${id}`, { method: 'DELETE' });
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    return apiFetch('/api/categories');
  },

  // Ingredients
  async getIngredients(category?: string) {
    const path = category ? `/api/ingredients?category=${category}` : '/api/ingredients';
    return apiFetch(path);
  },

  // Orders
  async getOrders(status?: string) {
    const path = status ? `/api/orders?status=${status}` : '/api/orders';
    return apiFetch(path);
  },

  async getOrder(id: string) {
    return apiFetch(`/api/orders/${id}`);
  },

  async createOrder(order: OrderPayload) {
    return apiFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
  },

  async updateOrder(id: string, data: OrderPayload) {
    return apiFetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async updateOrderStatus(id: string, status: OrderStatus) {
    return apiFetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  },

  // Campaigns
  async getCampaigns() {
    return apiFetch('/api/campaigns');
  },

  async createCampaign(campaign: Partial<Campaign>) {
    return apiFetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign)
    });
  },

  async updateCampaign(id: string, data: Partial<Campaign>) {
    return apiFetch(`/api/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Stats
  async getStats() {
    return apiFetch('/api/stats');
  },

  // Clients
  async getClients(params?: { estado?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.estado) query.set('estado', params.estado);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiFetch(`/api/clients${qs ? `?${qs}` : ''}`);
  },

  async getClient(id: string) {
    return apiFetch(`/api/clients/${id}`);
  },

  async createClient(client: ClientPayload) {
    return apiFetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client)
    });
  },

  // Partial update: only covers vip/notas/tags/estado (matches the backend's PATCH route).
  async updateClientStatus(id: string, data: { vip?: boolean; notas?: string; tags?: string[]; estado?: string }) {
    return apiFetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Full profile edit: nombre/telefono/email/direccion/notas/cumpleanos.
  async updateClientProfile(id: string, data: ClientPayload) {
    return apiFetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async getClientOrders(id: string) {
    return apiFetch(`/api/clients/${id}/orders`);
  },

  // Loyalty
  async getLoyaltyRewards() {
    return apiFetch('/api/loyalty/rewards');
  },

  async createLoyaltyReward(reward: LoyaltyRewardPayload) {
    return apiFetch('/api/loyalty/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reward)
    });
  },

  async updateLoyaltyReward(id: string, data: LoyaltyRewardPayload) {
    return apiFetch(`/api/loyalty/rewards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteLoyaltyReward(id: string) {
    return apiFetch(`/api/loyalty/rewards/${id}`, { method: 'DELETE' });
  },

  async getLoyaltyPoints(clientId: string) {
    return apiFetch(`/api/loyalty/points/${clientId}`);
  },

  async addLoyaltyPoints(data: { clientId: string; puntos: number; concepto?: string; referencia?: string }) {
    return apiFetch('/api/loyalty/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Menu: variants
  async getMenuVariants(): Promise<MenuVariant[]> {
    return apiFetch('/api/menu/variants');
  },

  async createMenuVariant(variant: MenuVariantPayload) {
    return apiFetch('/api/menu/variants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variant)
    });
  },

  async updateMenuVariant(id: string, data: MenuVariantPayload) {
    return apiFetch(`/api/menu/variants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteMenuVariant(id: string) {
    return apiFetch(`/api/menu/variants/${id}`, { method: 'DELETE' });
  },

  // Menu: combos
  async getMenuCombos(): Promise<MenuCombo[]> {
    return apiFetch('/api/menu/combos');
  },

  async createMenuCombo(combo: MenuComboPayload) {
    return apiFetch('/api/menu/combos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(combo)
    });
  },

  async updateMenuCombo(id: string, data: MenuComboPayload) {
    return apiFetch(`/api/menu/combos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteMenuCombo(id: string) {
    return apiFetch(`/api/menu/combos/${id}`, { method: 'DELETE' });
  },

  // Menu: promotions
  async getMenuPromotions(): Promise<MenuPromotion[]> {
    return apiFetch('/api/menu/promotions');
  },

  async createMenuPromotion(promotion: MenuPromotionPayload) {
    return apiFetch('/api/menu/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promotion)
    });
  },

  async updateMenuPromotion(id: string, data: MenuPromotionPayload) {
    return apiFetch(`/api/menu/promotions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteMenuPromotion(id: string) {
    return apiFetch(`/api/menu/promotions/${id}`, { method: 'DELETE' });
  },

  // Expenses / finance
  async getExpenses(params?: { desde?: string; hasta?: string }): Promise<Expense[]> {
    const query = new URLSearchParams();
    if (params?.desde) query.set('desde', params.desde);
    if (params?.hasta) query.set('hasta', params.hasta);
    const qs = query.toString();
    return apiFetch(`/api/expenses${qs ? `?${qs}` : ''}`);
  },

  async createExpense(expense: ExpensePayload) {
    return apiFetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
  },

  async getFinanceSummary(): Promise<FinanceSummary> {
    return apiFetch('/api/finance/summary');
  },

  // Reviews
  async createReview(review: ReviewPayload) {
    return apiFetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review)
    });
  },

  async getApprovedReviews(): Promise<Review[]> {
    return apiFetch('/api/reviews/approved');
  },

  async getReviews(status?: string): Promise<Review[]> {
    const qs = status ? `?status=${status}` : '';
    return apiFetch(`/api/reviews${qs}`);
  },

  async updateReviewStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
    return apiFetch(`/api/reviews/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  },

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    return apiFetch('/api/inventory');
  },

  async createInventoryItem(item: InventoryItemPayload) {
    return apiFetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  },

  async createInventoryMovement(data: { itemId: string; tipo: 'entrada' | 'salida'; cantidad: number; motivo: string; referencia?: string; usuario?: string }) {
    return apiFetch('/api/inventory/movement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async getInventoryMovements(): Promise<InventoryMovement[]> {
    return apiFetch('/api/inventory/movements');
  },

  // Recipes
  async getRecipes(): Promise<Recipe[]> {
    return apiFetch('/api/recipes');
  }
};

export default api;
