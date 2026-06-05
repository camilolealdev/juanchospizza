
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || 'Error en la solicitud');
  }
  return response.json();
};

export const api = {
  // Health
  async health() {
    return fetch(`${API_BASE}/api/health`).then(handleResponse);
  },

  // Products
  async getProducts(category?: string) {
    const url = category ? `${API_BASE}/api/products?category=${category}` : `${API_BASE}/api/products`;
    return fetch(url).then(handleResponse);
  },

  async getProduct(id: string) {
    return fetch(`${API_BASE}/api/products/${id}`).then(handleResponse);
  },

  // Categories
  async getCategories() {
    return fetch(`${API_BASE}/api/categories`).then(handleResponse);
  },

  // Ingredients
  async getIngredients(category?: string) {
    const url = category ? `${API_BASE}/api/ingredients?category=${category}` : `${API_BASE}/api/ingredients`;
    return fetch(url).then(handleResponse);
  },

  // Orders
  async getOrders(status?: string) {
    const url = status ? `${API_BASE}/api/orders?status=${status}` : `${API_BASE}/api/orders`;
    return fetch(url).then(handleResponse);
  },

  async getOrder(id: string) {
    return fetch(`${API_BASE}/api/orders/${id}`).then(handleResponse);
  },

  async createOrder(order: any) {
    return fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    }).then(handleResponse);
  },

  async updateOrder(id: string, data: any) {
    return fetch(`${API_BASE}/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse);
  },

  async updateOrderStatus(id: string, status: string) {
    return fetch(`${API_BASE}/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).then(handleResponse);
  },

  // Campaigns
  async getCampaigns() {
    return fetch(`${API_BASE}/api/campaigns`).then(handleResponse);
  },

  async createCampaign(campaign: any) {
    return fetch(`${API_BASE}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign)
    }).then(handleResponse);
  },

  async updateCampaign(id: string, data: any) {
    return fetch(`${API_BASE}/api/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse);
  },

  // Stats
  async getStats() {
    return fetch(`${API_BASE}/api/stats`).then(handleResponse);
  }
};

export default api;
