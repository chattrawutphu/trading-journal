import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createTransactionStore() {
    const { subscribe, set, update } = writable({
        transactions: [],
        loading: false,
        error: null
    });

    return {
        subscribe,
        createTransaction: async(accountId, type, amount, date = new Date(), note = '') => {
            try {
                const response = await api.createTransaction({
                    accountId,
                    type,
                    amount: parseFloat(amount),
                    date: date.toISOString(),
                    note
                });

                if (!response.success) {
                    throw new Error(response.error || 'Failed to create transaction');
                }

                await transactionStore.fetchTransactions(accountId);
                return response.data;
            } catch (error) {
                console.error('Transaction error:', error);
                throw new Error('Failed to create transaction. Please try again.');
            }
        },
        updateTransaction: async(transactionId, data) => {
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
        deleteTransaction: async(transactionId) => {
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
        fetchTransactions: async(accountId) => {
            update(state => ({...state, loading: true, error: null }));
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
            } catch (error) {
                update(state => ({
                    ...state,
                    error: error.message || 'Failed to fetch transactions',
                    loading: false,
                    transactions: []
                }));
            }
        },
        getTransactions: async(accountId) => {
            let state;
            subscribe(s => state = s)();

            if (state.transactions.length === 0) {
                await transactionStore.fetchTransactions(accountId);
                subscribe(s => state = s)();
            }

            return state.transactions;
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