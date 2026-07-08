
import type { Order, Campaign, OrderStatus, Client, LoyaltyReward } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type OrderPayload = Partial<Order>;
type ClientPayload = Partial<Client>;
type LoyaltyRewardPayload = Partial<LoyaltyReward>;

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

  // Categories
  async getCategories() {
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
  }
};

export default api;
