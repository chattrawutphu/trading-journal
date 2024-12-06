// src/lib/utils/api.js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchWithAuth(endpoint, options = {}) {
  try {
    let headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'An unexpected error occurred');
    }

    return response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to server. Please check your internet connection.');
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

  async getAccount(accountId) {
    return fetchWithAuth(`/accounts/${accountId}`);
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

  async updateBalance(accountId, balance) {
    return fetchWithAuth(`/accounts/${accountId}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ balance }),
    });
  },

  async deleteAccount(accountId) {
    return fetchWithAuth(`/accounts/${accountId}`, {
      method: 'DELETE',
    });
  },

  // Account Symbols endpoints
  async getAccountSymbols(accountId) {
    return fetchWithAuth(`/accounts/${accountId}/symbols`);
  },

  async updateAccountSymbols(accountId, symbols) {
    return fetchWithAuth(`/accounts/${accountId}/symbols`, {
      method: 'PUT',
      body: JSON.stringify({ symbols }),
    });
  },

  async addAccountSymbol(accountId, symbol) {
    return fetchWithAuth(`/accounts/${accountId}/symbols`, {
      method: 'POST',
      body: JSON.stringify({ symbol }),
    });
  },

  async removeAccountSymbol(accountId, symbol) {
    return fetchWithAuth(`/accounts/${accountId}/symbols/${symbol}`, {
      method: 'DELETE',
    });
  },

  // User Strategies endpoints
  async getUserStrategies() {
    return fetchWithAuth('/user/strategies');
  },

  async updateUserStrategies(strategies) {
    return fetchWithAuth('/user/strategies', {
      method: 'PUT',
      body: JSON.stringify({ strategies }),
    });
  },

  async addUserStrategy(strategy) {
    return fetchWithAuth('/user/strategies', {
      method: 'POST',
      body: JSON.stringify({ strategy }),
    });
  },

  async removeUserStrategy(strategy) {
    return fetchWithAuth(`/user/strategies/${encodeURIComponent(strategy)}`, {
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

  // Transaction endpoints
  async getTransactions(accountId) {
    return fetchWithAuth(`/transactions/${accountId}`);
  },

  async createTransaction(transactionData) {
    return fetchWithAuth('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  },

  async updateTransaction(transactionId, transactionData) {
    return fetchWithAuth(`/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData),
    });
  },

  async deleteTransaction(transactionId) {
    return fetchWithAuth(`/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  },

  // Subscription endpoints
  async getSubscriptionStatus() {
    return fetchWithAuth('/subscription/status');
  },

  async createSubscription(planType) {
    return fetchWithAuth('/subscription/create', {
      method: 'POST',
      body: JSON.stringify({ planType })
    });
  },

  async cancelSubscription() {
    return fetchWithAuth('/subscription/cancel', {
      method: 'POST'
    });
  },

  async reactivateSubscription() {
    return fetchWithAuth('/subscription/reactivate', {
      method: 'POST'
    });
  },

  async getInvoices() {
    return fetchWithAuth('/subscription/invoices');
  },

  async downloadInvoice(invoiceId) {
    return fetchWithAuth(`/subscription/invoices/${invoiceId}/download`);
  },

  // Payment endpoints
  async processPayment(planType, paymentMethod) {
    return fetchWithAuth('/subscription/process-payment', {
      method: 'POST',
      body: JSON.stringify({ planType, paymentMethod })
    });
  },
};
