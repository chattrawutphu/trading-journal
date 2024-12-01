// src/lib/utils/api.js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchWithAuth(endpoint, options = {}) {
  try {
    const auth = localStorage.getItem('auth');
    let headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (auth) {
      const { token } = JSON.parse(auth);
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Resource not found');
      }
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to server. Please make sure the server is running.');
    }
    throw error;
  }
}

export const api = {
  // Auth endpoints
  async login(email, password) {
    return fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(userData) {
    return fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async logout() {
    return fetchWithAuth('/auth/logout', {
      method: 'POST',
    });
  },

  async getProfile() {
    return fetchWithAuth('/auth/profile');
  },

  async updateProfile(userData) {
    return fetchWithAuth('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  async verifyToken(token) {
    return fetchWithAuth('/auth/verify-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  // Account endpoints
  async getAccounts() {
    return fetchWithAuth('/accounts');
  },

  async createAccount(accountData) {
    return fetchWithAuth('/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  },

  async updateAccount(accountId, accountData) {
    return fetchWithAuth(`/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(accountData),
    });
  },

  async deleteAccount(accountId) {
    return fetchWithAuth(`/accounts/${accountId}`, {
      method: 'DELETE',
    });
  },

  // Trade endpoints
  async getTrades(accountId, filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return fetchWithAuth(`/trades?accountId=${accountId}&${queryString}`);
  },

  async getStats(accountId, period) {
    return fetchWithAuth(`/trades/stats?accountId=${accountId}&period=${period}`);
  },

  async createTrade(tradeData) {
    return fetchWithAuth('/trades', {
      method: 'POST',
      body: JSON.stringify(tradeData),
    });
  },

  async updateTrade(tradeId, tradeData) {
    return fetchWithAuth(`/trades/${tradeId}`, {
      method: 'PUT',
      body: JSON.stringify(tradeData),
    });
  },

  async deleteTrade(tradeId) {
    return fetchWithAuth(`/trades/${tradeId}`, {
      method: 'DELETE',
    });
  },

  async toggleFavorite(tradeId) {
    return fetchWithAuth(`/trades/${tradeId}/favorite`, {
      method: 'POST',
    });
  },

  async toggleDisabled(tradeId) {
    return fetchWithAuth(`/trades/${tradeId}/disable`, {
      method: 'POST',
    });
  },

  // Trade Options endpoints
  async getTradeOptions(type) {
    return fetchWithAuth(`/trade-options?type=${type}`);
  },

  async createTradeOption(optionData) {
    return fetchWithAuth('/trade-options', {
      method: 'POST',
      body: JSON.stringify(optionData),
    });
  },

  async updateTradeOption(optionId, optionData) {
    return fetchWithAuth(`/trade-options/${optionId}`, {
      method: 'PUT',
      body: JSON.stringify(optionData),
    });
  },

  async deleteTradeOption(optionId) {
    return fetchWithAuth(`/trade-options/${optionId}`, {
      method: 'DELETE',
    });
  },

  async incrementTradeOptionUsage(optionId) {
    return fetchWithAuth(`/trade-options/${optionId}/increment`, {
      method: 'POST',
    });
  },

  // User Settings endpoints
  async getUserSettings() {
    return fetchWithAuth('/settings');
  },

  async updateUserSettings(section, data) {
    return fetchWithAuth('/settings', {
      method: 'PUT',
      body: JSON.stringify({ section, data }),
    });
  },
};
