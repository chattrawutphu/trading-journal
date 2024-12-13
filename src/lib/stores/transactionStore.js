import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';
import { transactionCacheStore } from '$lib/stores/transactionCache';

function createTransactionStore() {
  const { subscribe, set, update } = writable({
    transactions: [],
    loading: false,
    error: null
  });

  return {
    subscribe,
    createTransaction: async (accountId, type, amount, date = new Date(), note = '') => {
      try {
        const response = await api.createTransaction({
          accountId,
          type,
          amount: parseFloat(amount),
          date: date.toISOString(),
          note // Include note
        });
        if (!response.success) {
          throw new Error(response.error);
        }
        return response.data;
      } catch (error) {
        throw new Error(error.message || 'Failed to create transaction');
      }
    },
    updateTransaction: async (transactionId, data) => {
      try {
        const response = await api.updateTransaction(transactionId, data);
        if (!response.success) {
          throw new Error(response.error);
        }
        return response.data;
      } catch (error) {
        throw new Error(error.message || 'Failed to update transaction');
      }
    },
    deleteTransaction: async (transactionId) => {
      try {
        const response = await api.deleteTransaction(transactionId);
        if (!response.success) {
          throw new Error(response.error);
        }
        return response.data;
      } catch (error) {
        throw new Error(error.message || 'Failed to delete transaction');
      }
    },
    fetchTransactions: async (accountId) => {
      update(state => ({ ...state, loading: true, error: null }));
      try {
        const response = await api.getTransactions(accountId);
        if (!response.success) {
          throw new Error(response.error);
        }
        update(state => ({
          ...state,
          transactions: response.data || [],
          loading: false
        }));
        transactionCacheStore.setCache(accountId, response.data || []);
      } catch (error) {
        update(state => ({
          ...state,
          error: error.message || 'Failed to fetch transactions',
          loading: false,
          transactions: []
        }));
      }
    },
    reset: () => {
      set({
        transactions: [],
        loading: false,
        error: null
      });
    }
  };
}

export const transactionStore = createTransactionStore();
