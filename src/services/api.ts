import type {
  Order,
  Campaign,
  OrderStatus,
  Client,
  LoyaltyReward,
  Product,
  Category,
  Employee,
  Shift,
  LocationId,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type OrderPayload = Partial<Order>;
type ClientPayload = Partial<Client>;
export interface NewEmployeePayload {
  nombre: string;
  role: Employee['role'];
  pin: string;
  locationId?: Employee['locationId'];
}
export type EmployeeUpdatePayload = Partial<Pick<Employee, 'nombre' | 'role' | 'locationId' | 'activo'>>;
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
  activo?: boolean;
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

// ── Decodificar JWT sin verificar firma (frontend) ──────────────
// Solo leemos el payload para saber cuándo expira. La verificación
// la hace el backend. La función es segura: si el token está mal
// formado, devuelve null y el código no refresca.
function decodeTokenPayload(token: string): { exp?: number } | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// ── Cola de refresco ───────────────────────────────────────────
// Múltiples llamadas API simultáneas cerca del vencimiento del token
// NO deben disparar N refrescos paralelos. Con este patrón, la primera
// llama inicia el refresco y las siguientes esperan la misma promesa.
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const current = getAuthToken();
  if (!current) return null;

  // Si ya hay un refresco en curso, esperar esa promesa en vez de
  // disparar otro (evita N refrescos paralelos cuando N llamadas API
  // se disparan simultáneamente justo antes de expirar).
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: current }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.token) {
        setAuthSession({ token: data.token });
        return data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Token expiring? Refresh automático ─────────────────────────
// Si el token expira en menos de REFRESH_MARGIN_SECONDS, dispara un
// refresh contra /api/auth/refresh ANTES de ejecutar la llamada real.
// Esto evita el escenario "token expiró entre el check y la request"
// que produce un 401 inevitable que el código actual maneja como
// "sesión cerrada" cuando en realidad se podía refrescar.
const REFRESH_MARGIN_SECONDS = 120; // 2 minutos antes de expirar

// Reemplaza el authHeaders simple por uno que refresca si es necesario.
// Llamado en cada apiFetch antes de construir los headers finales.
async function ensureFreshToken(): Promise<Record<string, string>> {
  const token = getAuthToken();
  if (!token) return {};

  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return { Authorization: `Bearer ${token}` };

  const now = Math.floor(Date.now() / 1000);
  const ttl = payload.exp - now;

  // Si expira en menos de 2 minutos, refrescar
  if (ttl > 0 && ttl < REFRESH_MARGIN_SECONDS) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      return { Authorization: `Bearer ${newToken}` };
    }
    // Refresh falló (red/backend caído) pero el token actual todavía
    // no expiró -- usar el viejo y dejar que el backend rechace si
    // corresponde en vez de forzar logout prematuramente.
  }

  return { Authorization: `Bearer ${token}` };
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    // 401 con token expirado → intentar refresh antes de declarar
    // sesión perdida. Si el refresh funciona, el error NO se propaga
    // y el caller original retryea con el nuevo token.
    if (response.status === 401) {
      const current = getAuthToken();
      if (current) {
        const newToken = await tryRefreshToken();
        if (newToken) {
          // Token refreshed exitosamente -- el caller DEBE reintentar
          // la request original. Lanzamos un error especial que apiFetch
          // atrapa y reintenta automáticamente.
          const err = new Error('__TOKEN_REFRESHED__') as Error & { needsRetry: boolean; freshToken: string };
          err.needsRetry = true;
          err.freshToken = newToken;
          throw err;
        }
      }
      // No hay token o el refresh falló → forzar logout
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

// Central fetch wrapper: refresca token si es necesario, mergea headers,
// y reintenta automáticamente si un 401 se resolvió con refresh.
const apiFetch = async (path: string, options: RequestInit = {}) => {
  const tokenHeaders = await ensureFreshToken();
  const headers: Record<string, string> = {
    ...tokenHeaders,
    ...(options.headers as Record<string, string> | undefined),
  };

  const doFetch = (customHeaders: Record<string, string>): Promise<Response> =>
    fetch(`${API_BASE}${path}`, { ...options, headers: customHeaders });

  try {
    const response = await doFetch(headers);
    return handleResponse(response);
  } catch (err) {
    // Si handleResponse lanzó __TOKEN_REFRESHED__, reintentar una vez
    // con el token nuevo antes de rendirnos.
    if (err instanceof Error && (err as Error & { needsRetry?: boolean }).needsRetry) {
      const freshToken = (err as Error & { freshToken: string }).freshToken;
      const retryHeaders: Record<string, string> = {
        Authorization: `Bearer ${freshToken}`,
        ...(options.headers as Record<string, string> | undefined),
      };
      try {
        const retryResponse = await doFetch(retryHeaders);
        return handleResponse(retryResponse);
      } catch (retryErr) {
        // El reintento también falló -- propagar el error original
        if (retryErr instanceof Error && (retryErr as Error & { needsRetry?: boolean }).needsRetry) {
          clearAuthSession();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
          }
          throw new Error('Sesión expirada. Ingresá de nuevo con tu PIN.');
        }
        // Propagate the actual API error (400, 403, 422, etc.)
        throw retryErr;
      }
    }

    // Si es un TypeError (fetch rechazó = network/DNS/CORS failure),
    // mostrar mensaje amigable. Los otros errores (API 400/403/422)
    // ya fueron lanzados por handleResponse con su mensaje real.
    if (err instanceof TypeError) {
      throw new Error(
        'No pudimos conectar con el servidor. Probá de nuevo en un momento o pedí por WhatsApp mientras tanto.'
      );
    }
    throw err;
  }
};

export const api = {
  // Auth
  // password es opcional -- solo lo exige el backend para la cuenta
  // isSuperAdmin (ver server/auth.js authenticate()). El resto de roles
  // sigue funcionando con PIN solo.
  async login(username: string, pin?: string, password?: string) {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin, password }),
    });
  },

  async refreshToken(token: string) {
    return apiFetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  },

  // Health
  async health() {
    return apiFetch('/api/health');
  },

  // Payments (admin)
  async getPaymentStatus(): Promise<Record<string, { configured: boolean; webhookSecret: boolean | null }>> {
    return apiFetch('/api/payments/status');
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
      body: JSON.stringify(product),
    });
  },

  async updateProduct(id: string, data: ProductPayload) {
    return apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(id: string) {
    return apiFetch(`/api/products/${id}`, { method: 'DELETE' });
  },

  async bulkImportProducts(
    products: ProductPayload[]
  ): Promise<{ inserted: number; errors: { row: number; nombre?: string; error: string }[] }> {
    return apiFetch('/api/products/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    });
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

  // Order tracking (guest, público, requiere teléfono)
  async trackOrder(
    orderNumber: string,
    phone: string
  ): Promise<{
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    estimatedTime: number;
    paymentStatus: string | null;
    paymentMethod: string;
  }> {
    return apiFetch(`/api/orders/track/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(phone)}`);
  },

  // Orders
  async getOrders(status?: string, options?: { paidOnly?: boolean }) {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (options?.paidOnly) query.set('paidOnly', 'true');
    const qs = query.toString();
    return apiFetch(`/api/orders${qs ? `?${qs}` : ''}`);
  },

  async getOrder(id: string) {
    return apiFetch(`/api/orders/${id}`);
  },

  async createOrder(order: OrderPayload) {
    return apiFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
  },

  async updateOrder(id: string, data: OrderPayload) {
    return apiFetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateOrderStatus(id: string, status: OrderStatus) {
    return apiFetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
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
      body: JSON.stringify(campaign),
    });
  },

  async updateCampaign(id: string, data: Partial<Campaign>) {
    return apiFetch(`/api/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteCampaign(id: string) {
    return apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
  },

  // Stats
  async getStats(locationId?: string) {
    return apiFetch(`/api/stats${locationId ? `?locationId=${locationId}` : ''}`);
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
      body: JSON.stringify(client),
    });
  },

  // Partial update: only covers vip/notas/tags/estado (matches the backend's PATCH route).
  async updateClientStatus(id: string, data: { vip?: boolean; notas?: string; tags?: string[]; estado?: string }) {
    return apiFetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Full profile edit: nombre/telefono/email/direccion/notas/cumpleanos.
  async updateClientProfile(id: string, data: ClientPayload) {
    return apiFetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getClientOrders(id: string) {
    return apiFetch(`/api/clients/${id}/orders`);
  },

  // Fails with a 409 if the client has real order history (FK-protected
  // server-side) -- callers should catch that and suggest estado:'perdido' instead.
  async deleteClient(id: string) {
    return apiFetch(`/api/clients/${id}`, { method: 'DELETE' });
  },

  // Loyalty
  async getLoyaltyRewards() {
    return apiFetch('/api/loyalty/rewards');
  },

  async createLoyaltyReward(reward: LoyaltyRewardPayload) {
    return apiFetch('/api/loyalty/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reward),
    });
  },

  async updateLoyaltyReward(id: string, data: LoyaltyRewardPayload) {
    return apiFetch(`/api/loyalty/rewards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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
      body: JSON.stringify(data),
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
      body: JSON.stringify(variant),
    });
  },

  async updateMenuVariant(id: string, data: MenuVariantPayload) {
    return apiFetch(`/api/menu/variants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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
      body: JSON.stringify(combo),
    });
  },

  async updateMenuCombo(id: string, data: MenuComboPayload) {
    return apiFetch(`/api/menu/combos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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
      body: JSON.stringify(promotion),
    });
  },

  async updateMenuPromotion(id: string, data: MenuPromotionPayload) {
    return apiFetch(`/api/menu/promotions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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
      body: JSON.stringify(expense),
    });
  },

  async updateExpense(id: string, expense: ExpensePayload) {
    return apiFetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
  },

  async deleteExpense(id: string) {
    return apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
  },

  async getFinanceSummary(): Promise<FinanceSummary> {
    return apiFetch('/api/finance/summary');
  },

  // Reviews
  async createReview(review: ReviewPayload) {
    return apiFetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
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
      body: JSON.stringify({ status }),
    });
  },

  async deleteReview(id: string) {
    return apiFetch(`/api/reviews/${id}`, { method: 'DELETE' });
  },

  // Push notifications
  async subscribePush(data: { phone?: string; clientId?: string; endpoint: string; p256dh: string; auth: string }) {
    return apiFetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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
      body: JSON.stringify(item),
    });
  },

  async updateInventoryItem(id: string, item: InventoryItemPayload) {
    return apiFetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  },

  async createInventoryMovement(data: {
    itemId: string;
    tipo: 'entrada' | 'salida';
    cantidad: number;
    motivo: string;
    referencia?: string;
    usuario?: string;
  }) {
    return apiFetch('/api/inventory/movement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getInventoryMovements(): Promise<InventoryMovement[]> {
    return apiFetch('/api/inventory/movements');
  },

  // Recipes
  async getRecipes(): Promise<Recipe[]> {
    return apiFetch('/api/recipes');
  },

  // Employees (staff roster -- CRUD only, not wired into the login flow yet)
  async getEmployees(): Promise<Employee[]> {
    return apiFetch('/api/employees');
  },

  async createEmployee(employee: NewEmployeePayload) {
    return apiFetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
  },

  async updateEmployee(id: string, data: EmployeeUpdatePayload) {
    return apiFetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteEmployee(id: string) {
    return apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
  },

  // Shifts (turnos y control de caja)
  async getShifts(params?: { locationId?: LocationId; status?: 'open' | 'closed' }): Promise<Shift[]> {
    const query = new URLSearchParams();
    if (params?.locationId) query.set('locationId', params.locationId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return apiFetch(`/api/shifts${qs ? `?${qs}` : ''}`);
  },

  async getCurrentShift(locationId: LocationId): Promise<Shift | null> {
    return apiFetch(`/api/shifts/current?locationId=${locationId}`);
  },

  async openShift(data: { locationId: LocationId; openingCash: number }): Promise<Shift> {
    return apiFetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async closeShift(id: string, data: { closingCash: number; notas?: string }): Promise<Shift> {
    return apiFetch(`/api/shifts/${id}/close`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // ---- UNIFIED MENU ----
  async getFullMenu(): Promise<{
    categories: Category[];
    products: Product[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variants: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    combos: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    promotions: any[];
    updatedAt: string;
  }> {
    return apiFetch('/api/menu');
  },

  // ---- DINING TABLES ----
  async getTables(params?: { locationId?: string; area?: string; status?: string; includeInactive?: string }) {
    const query = new URLSearchParams();
    if (params?.locationId) query.set('locationId', params.locationId);
    if (params?.area) query.set('area', params.area);
    if (params?.status) query.set('status', params.status);
    if (params?.includeInactive) query.set('includeInactive', params.includeInactive);
    const qs = query.toString();
    return apiFetch(`/api/tables${qs ? `?${qs}` : ''}`);
  },

  async getTable(id: string) {
    return apiFetch(`/api/tables/${id}`);
  },

  async createTable(data: { name: string; capacity?: number; area?: string; locationId?: string; notes?: string }) {
    return apiFetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateTable(id: string, data: Record<string, unknown>) {
    return apiFetch(`/api/tables/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async batchUpdateTableStatus(ids: string[], status: string) {
    return apiFetch('/api/tables/batch-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status }),
    });
  },

  async getFloorPlan(locationId?: string) {
    const qs = locationId ? `?locationId=${locationId}` : '';
    return apiFetch(`/api/tables/floor-plan${qs}`);
  },

  // ---- CASH REGISTER ----
  async getCashRegisterEntries(params?: { locationId?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.locationId) query.set('locationId', params.locationId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return apiFetch(`/api/cash-register${qs ? `?${qs}` : ''}`);
  },

  async openCashRegister(data: { locationId: string; openedBy: string; initialAmount?: number; notes?: string }) {
    return apiFetch('/api/cash-register/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async closeCashRegister(id: string, data: { finalAmount: number; closedBy: string; notes?: string }) {
    return apiFetch(`/api/cash-register/${id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // ---- TIPS ----
  async getTips(params?: { locationId?: string; desde?: string; hasta?: string }) {
    const query = new URLSearchParams();
    if (params?.locationId) query.set('locationId', params.locationId);
    if (params?.desde) query.set('desde', params.desde);
    if (params?.hasta) query.set('hasta', params.hasta);
    const qs = query.toString();
    return apiFetch(`/api/tips${qs ? `?${qs}` : ''}`);
  },

  async createTip(data: {
    orderId: string;
    amount: number;
    method?: string;
    waiterName?: string;
    locationId?: string;
  }) {
    return apiFetch('/api/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getTipsSummary(params?: { locationId?: string; desde?: string; hasta?: string }) {
    const query = new URLSearchParams();
    if (params?.locationId) query.set('locationId', params.locationId);
    if (params?.desde) query.set('desde', params.desde);
    if (params?.hasta) query.set('hasta', params.hasta);
    const qs = query.toString();
    return apiFetch(`/api/tips/summary${qs ? `?${qs}` : ''}`);
  },

  // ---- COMANDAS ----
  async getComandas(params?: { status?: string; locationId?: string; tableId?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.locationId) query.set('locationId', params.locationId);
    if (params?.tableId) query.set('tableId', params.tableId);
    const qs = query.toString();
    return apiFetch(`/api/comandas${qs ? `?${qs}` : ''}`);
  },

  async getComanda(id: string) {
    return apiFetch(`/api/comandas/${id}`);
  },

  async createComanda(data: {
    tableId: string;
    waiterName?: string;
    guestCount?: number;
    notes?: string;
    locationId?: string;
  }) {
    return apiFetch('/api/comandas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async closeComanda(id: string, data: { total: number; notes?: string; paymentMethod?: string }) {
    return apiFetch(`/api/comandas/${id}/close`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async addComandaItem(data: {
    comandaId: string;
    productId?: string;
    productName: string;
    quantity?: number;
    unitPrice?: number;
    notes?: string;
  }) {
    return apiFetch('/api/comandas/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async bulkAddComandaItems(
    comandaId: string,
    items: { productId?: string; productName: string; quantity?: number; unitPrice?: number; notes?: string }[]
  ) {
    return apiFetch('/api/comandas/items/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comandaId, items }),
    });
  },

  async updateComandaItem(id: string, data: { quantity?: number; status?: string; notes?: string }) {
    return apiFetch(`/api/comandas/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteComandaItem(id: string) {
    return apiFetch(`/api/comandas/items/${id}`, { method: 'DELETE' });
  },

  async splitComanda(id: string, splits: { productIds: string[]; guestName?: string }[], guestCount?: number) {
    return apiFetch(`/api/comandas/${id}/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: splits, guestCount }),
    });
  },

  async getKitchenTicket(comandaId: string) {
    return apiFetch(`/api/comandas/${comandaId}/kitchen-ticket`);
  },

  // ---- DIGITURNO (turnos digitales para pedidos en local) ----
  async getDigiturnoTickets(params?: { status?: string; locationId?: string; orderType?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.locationId) query.set('locationId', params.locationId);
    if (params?.orderType) query.set('orderType', params.orderType);
    const qs = query.toString();
    return apiFetch(`/api/digiturno${qs ? `?${qs}` : ''}`);
  },

  async getDigiturnoQueue(locationId?: string) {
    const qs = locationId ? `?locationId=${locationId}` : '';
    return apiFetch(`/api/digiturno/queue${qs}`);
  },

  async getCurrentDigiturnoTicket(locationId?: string) {
    const qs = locationId ? `?locationId=${locationId}` : '';
    return apiFetch(`/api/digiturno/current${qs}`);
  },

  async createDigiturnoTicket(data: {
    orderType?: string;
    locationId?: string;
    tableId?: string;
    tableName?: string;
    customerName?: string;
    guestCount?: number;
    source?: string;
    items?: unknown[];
    total?: number;
    notes?: string;
  }) {
    return apiFetch('/api/digiturno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateDigiturnoTicketStatus(id: string, status: string) {
    return apiFetch(`/api/digiturno/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  async updateDigiturnoTicket(id: string, data: Record<string, unknown>) {
    return apiFetch(`/api/digiturno/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteDigiturnoTicket(id: string) {
    return apiFetch(`/api/digiturno/${id}`, { method: 'DELETE' });
  },

  // ---- PRINT ----
  getPrintReceiptUrl(orderId: string) {
    const token = getAuthToken();
    const params = token ? `?token=${token}` : '';
    return `${API_BASE}/api/print/receipt/${orderId}${params}`;
  },

  getPrintKitchenTicketUrl(comandaId: string) {
    const token = getAuthToken();
    const params = token ? `?token=${token}` : '';
    return `${API_BASE}/api/print/kitchen-ticket/${comandaId}${params}`;
  },

  getPrintComandaReceiptUrl(comandaId: string) {
    const token = getAuthToken();
    const params = token ? `?token=${token}` : '';
    return `${API_BASE}/api/print/comanda-receipt/${comandaId}${params}`;
  },

  // ---- PROCUREMENT / PURCHASE ORDERS ----
  async getPurchaseOrders(params?: { status?: string; locationId?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.locationId) query.set('locationId', params.locationId);
    const qs = query.toString();
    return apiFetch(`/api/procurement${qs ? `?${qs}` : ''}`);
  },

  async getPurchaseOrder(id: string) {
    return apiFetch(`/api/procurement/${id}`);
  },

  async createPurchaseOrder(data: {
    proveedor: string;
    items: { itemId?: string; nombre: string; cantidad: number; unidad?: string; precioUnitario: number }[];
    fechaEntrega?: string;
    notas?: string;
    locationId?: string;
    createdBy?: string;
  }) {
    return apiFetch('/api/procurement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async receivePurchaseOrder(id: string) {
    return apiFetch(`/api/procurement/${id}/receive`, { method: 'PATCH' });
  },

  async deletePurchaseOrder(id: string) {
    return apiFetch(`/api/procurement/${id}`, { method: 'DELETE' });
  },

  // ---- INVOICES & CREDIT NOTES ----
  async getInvoices(params?: { status?: string; locationId?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.locationId) query.set('locationId', params.locationId);
    const qs = query.toString();
    return apiFetch(`/api/invoices${qs ? `?${qs}` : ''}`);
  },

  async getInvoice(id: string) {
    return apiFetch(`/api/invoices/${id}`);
  },

  async createInvoice(data: { orderId: string; tipoDocumento?: string; locationId?: string; notes?: string }) {
    return apiFetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateInvoice(id: string, data: Record<string, unknown>) {
    return apiFetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async sendInvoiceToDian(id: string) {
    return apiFetch(`/api/invoices/${id}/send`, { method: 'POST' });
  },

  async resendInvoiceToDian(id: string) {
    return apiFetch(`/api/invoices/${id}/resend`, { method: 'POST' });
  },

  getInvoiceXmlUrl(id: string) {
    const token = getAuthToken();
    const params = token ? `?token=${token}` : '';
    return `${API_BASE}/api/invoices/${id}/xml${params}`;
  },

  async getCreditNotes(invoiceId?: string) {
    const qs = invoiceId ? `?invoiceId=${invoiceId}` : '';
    return apiFetch(`/api/credit-notes${qs}`);
  },

  async createCreditNote(data: {
    invoiceId: string;
    tipoNota?: string;
    motivo: string;
    monto: number;
    items?: unknown[];
    createdBy?: string;
  }) {
    return apiFetch('/api/credit-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteCreditNote(id: string) {
    return apiFetch(`/api/credit-notes/${id}`, { method: 'DELETE' });
  },

  // ---- QR MENU ----
  async getQrMenuConfig(locationId?: string) {
    const qs = locationId ? `?locationId=${locationId}` : '';
    return apiFetch(`/api/qr-menu/config${qs}`);
  },

  async saveQrMenuConfig(data: {
    locationId: string;
    title?: string;
    showPrices?: boolean;
    showImages?: boolean;
    showCombos?: boolean;
    showPromotions?: boolean;
    categories?: string[];
  }) {
    return apiFetch('/api/qr-menu/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getQrCodes(locationId?: string) {
    const qs = locationId ? `?locationId=${locationId}` : '';
    return apiFetch(`/api/qr-menu/qr-codes${qs}`);
  },

  async regenerateQrCodes(locationId?: string) {
    return apiFetch('/api/qr-menu/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId }),
    });
  },

  // ---- PRINT URL HELPERS (for window.open) ----
  getPrintInvoiceUrl(invoiceId: string) {
    const token = getAuthToken();
    const params = token ? `?token=${token}` : '';
    return `${API_BASE}/api/print/invoice/${invoiceId}${params}`;
  },
};

export default api;
