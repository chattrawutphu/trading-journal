// src/lib/utils/api.js
const API_URL =
    import.meta.env.VITE_API_URL ||
    `http://localhost:${import.meta.env.VITE_SERVER_PORT}/api`;

export const api = {
    async fetch(endpoint, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...defaultOptions,
            ...options,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Something went wrong');
        }

        return response.json();
    },

    // Auth endpoints
    async login(email, password) {
        return await api.fetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    async register(userData) {
        return await api.fetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    async logout() {
        return await api.fetch('/auth/logout', {
            method: 'POST',
        });
    },

    async getProfile() {
        return await api.fetch('/auth/profile');
    },

    async updateProfile(userData) {
        return await api.fetch('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    },

    async verifyToken(token) {
        return await api.fetch('/auth/verify-token', {
            method: 'POST',
            body: JSON.stringify({ token }),
        });
    },

    // Account endpoints
    async getAccounts() {
        return await api.fetch('/accounts');
    },

    async getAccount(accountId) {
        return await api.fetch(`/accounts/${accountId}`);
    },

    async createAccount(accountData) {
        return await api.fetch('/accounts', {
            method: 'POST',
            body: JSON.stringify(accountData),
        });
    },

    async updateAccount(accountId, accountData) {
        return await api.fetch(`/accounts/${accountId}`, {
            method: 'PUT',
            body: JSON.stringify(accountData),
        });
    },

    async updateBalance(accountId, balance) {
        return await api.fetch(`/accounts/${accountId}/balance`, {
            method: 'PUT',
            body: JSON.stringify({ balance }),
        });
    },

    async deleteAccount(accountId) {
        return await api.fetch(`/accounts/${accountId}`, {
            method: 'DELETE',
        });
    },

    // Account Symbols endpoints
    async getAccountSymbols(accountId) {
        return await api.fetch(`/accounts/${accountId}/symbols`);
    },

    async updateAccountSymbols(accountId, symbols) {
        return await api.fetch(`/accounts/${accountId}/symbols`, {
            method: 'PUT',
            body: JSON.stringify({ symbols }),
        });
    },

    async addAccountSymbol(accountId, symbol) {
        return await api.fetch(`/accounts/${accountId}/symbols`, {
            method: 'POST',
            body: JSON.stringify({ symbol }),
        });
    },

    async removeAccountSymbol(accountId, symbol) {
        return await api.fetch(`/accounts/${accountId}/symbols/${symbol}`, {
            method: 'DELETE',
        });
    },

    // User Strategies endpoints
    async getUserStrategies() {
        return await api.fetch('/user/strategies');
    },

    async updateUserStrategies(strategies) {
        return await api.fetch('/user/strategies', {
            method: 'PUT',
            body: JSON.stringify({ strategies }),
        });
    },

    async addUserStrategy(strategy) {
        return await api.fetch('/user/strategies', {
            method: 'POST',
            body: JSON.stringify({ strategy }),
        });
    },

    async removeUserStrategy(strategy) {
        return await api.fetch(`/user/strategies/${encodeURIComponent(strategy)}`, {
            method: 'DELETE',
        });
    },

    // Trade endpoints
    async getTrades(accountId, filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return await api.fetch(`/trades?accountId=${accountId}&${queryString}`);
    },

    async getStats(accountId, period) {
        return await api.fetch(`/trades/stats?accountId=${accountId}&period=${period}`);
    },

    async createTrade(tradeData) {
        return await api.fetch('/trades', {
            method: 'POST',
            body: JSON.stringify(tradeData),
        });
    },

    async updateTrade(tradeId, tradeData) {
        return await api.fetch(`/trades/${tradeId}`, {
            method: 'PUT',
            body: JSON.stringify(tradeData),
        });
    },

    async deleteTrade(tradeId) {
        return await api.fetch(`/trades/${tradeId}`, {
            method: 'DELETE',
        });
    },

    async toggleFavorite(tradeId) {
        return await api.fetch(`/trades/${tradeId}/favorite`, {
            method: 'POST',
        });
    },

    async toggleDisabled(tradeId) {
        return await api.fetch(`/trades/${tradeId}/disable`, {
            method: 'POST',
        });
    },

    // User Settings endpoints
    async getUserSettings() {
        return await api.fetch('/settings');
    },

    async updateUserSettings(section, data) {
        return await api.fetch('/settings', {
            method: 'PUT',
            body: JSON.stringify({ section, data }),
        });
    },

    // Transaction endpoints
    async getTransactions(accountId) {
        return await api.fetch(`/transactions/${accountId}`);
    },

    async createTransaction(data) {
        return await api.fetch('/transactions', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateTransaction(transactionId, transactionData) {
        return await api.fetch(`/transactions/${transactionId}`, {
            method: 'PUT',
            body: JSON.stringify(transactionData),
        });
    },

    async deleteTransaction(transactionId) {
        return await api.fetch(`/transactions/${transactionId}`, {
            method: 'DELETE',
        });
    },

    // Subscription endpoints
    async getSubscriptionStatus() {
        try {
            return await api.fetch('/subscription/status');
        } catch (error) {
            console.error('Failed to get subscription status:', error);
            throw new Error('Failed to get subscription status. Please try again later.');
        }
    },

    async processDepayPayment(planType, txHash) {
        return await api.fetch('/subscription/process-payment', {
            method: 'POST',
            body: JSON.stringify({ planType, txHash, paymentMethod: 'depay' }),
        });
    },

    async cancelSubscription() {
        try {
            return await api.fetch('/subscription/cancel', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            throw new Error('Failed to cancel subscription. Please try again later.');
        }
    },

    async reactivateSubscription() {
        try {
            return await api.fetch('/subscription/reactivate', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Failed to reactivate subscription:', error);
            throw new Error('Failed to reactivate subscription. Please try again later.');
        }
    },

    async getInvoices() {
        try {
            return await api.fetch('/subscription/invoices');
        } catch (error) {
            console.error('Failed to get invoices:', error);
            throw new Error('Failed to get invoices. Please try again later.');
        }
    },

    async downloadInvoice(invoiceId) {
        try {
            return await api.fetch(`/subscription/invoices/${invoiceId}/download`);
        } catch (error) {
            console.error('Failed to download invoice:', error);
            throw new Error('Failed to download invoice. Please try again later.');
        }
    },

    // Payment Confirmation endpoint
    async confirmPayment(planType, txHash, signature) {
        return await api.fetch('/subscription/confirm-payment', {
            method: 'POST',
            body: JSON.stringify({ planType, txHash, signature }),
        });
    },

    // Create Depay Transaction
    async createDepayTransaction(data) {
        return await api.fetch('/subscription/create-depay-transaction', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // Get trade tags
    async getTradeTags() {
        return await api.fetch('/trade-options?type=TAG');
    },

    // Add trade tag
    async addTradeTag(tag) {
        return await api.fetch('/trade-options', {
            method: 'POST',
            body: JSON.stringify({ type: 'TAG', value: tag }),
        });
    },

    // Delete trade tag
    async deleteTradeTag(tagId) {
        return await api.fetch(`/trade-options/${tagId}`, {
            method: 'DELETE',
        });
    },

    // Layout endpoints
    async getLayouts() {
        return await api.fetch('/user/layouts');
    },

    async saveLayouts(layouts) {
        return await api.fetch('/user/layouts', {
            method: 'PUT',
            body: JSON.stringify({ layouts }),
        });
    },

    async testConnection(connectionData) {
        return await api.fetch('/accounts/test-connection', {
            method: 'POST',
            body: JSON.stringify(connectionData)
        });
    },

    // Add new function to fetch Binance trade history
    async fetchBinanceTradeHistory(apiKey, secretKey) {
        try {
            const response = await api.fetch('/accounts/binance-history', {
                method: 'POST',
                body: JSON.stringify({ 
                    apiKey, 
                    secretKey,
                    // Add timestamp to prevent caching
                    timestamp: Date.now()
                })
            });

            if (!response.success) {
                throw new Error(response.message || 'Failed to fetch trade history');
            }

            return response;
        } catch (error) {
            console.error('Error fetching Binance trade history:', error);
            throw error;
        }
    },

    // Day Config endpoints
    async getDayConfig(accountId, date) {
        return await api.fetch(`/accounts/${accountId}/day-configs/${date}`);
    },

    async createDayConfig(data) {
        return await api.fetch('/accounts/day-configs', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateDayConfig(accountId, date, data) {
        return await api.fetch(`/accounts/${accountId}/day-configs/${date}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async toggleDayFavorite(accountId, date) {
        return await api.fetch(`/accounts/${accountId}/day-configs/${date}/favorite`, {
            method: 'POST'
        });
    },

    // Day Tags endpoints
    async getDayTags() {
        return await api.fetch('/day-tags');
    },

    async createDayTag(tag) {
        if (!tag || typeof tag !== 'string') {
            throw new Error('Tag value is required and must be a string');
        }
        
        const trimmedTag = tag.trim();
        if (!trimmedTag) {
            throw new Error('Tag value cannot be empty');
        }

        return await api.fetch('/day-tags', {
            method: 'POST',
            body: JSON.stringify({ value: trimmedTag }),
        });
    },

    async deleteDayTag(tagId) {
        return await api.fetch(`/day-tags/${tagId}`, {
            method: 'DELETE',
        });
    },

    async incrementDayTagUsage(tagId) {
        return await api.fetch(`/day-tags/${tagId}/increment`, {
            method: 'POST',
        });
    },

    async updateDayTagUsage(tagIds) {
        return await api.fetch('/day-tags/update-usage', {
            method: 'POST',
            body: JSON.stringify({ tagIds }),
        });
    },

    async getTaggedDays(tag) {
        return await api.fetch(`/day-tags/${encodeURIComponent(tag)}/days`);
    },
};