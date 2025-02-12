// src/lib/stores/accountSymbolStore.js
import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createAccountSymbolStore() {
    const { subscribe, set, update } = writable({
        symbols: [],
        loading: false,
        error: null
    });

    return {
        subscribe,
        loadSymbols: async(accountId) => {
            try {
                update(state => ({...state, loading: true, error: null }));
                const symbols = await api.getAccountSymbols(accountId);
                update(state => ({
                    ...state,
                    symbols,
                    loading: false
                }));
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        addSymbol: async(accountId, symbol) => {
            try {
                update(state => ({...state, loading: true, error: null }));
                const symbols = await api.addAccountSymbol(accountId, symbol);
                update(state => ({
                    ...state,
                    symbols,
                    loading: false
                }));
                return symbols;
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        removeSymbol: async(accountId, symbol) => {
            try {
                update(state => ({...state, loading: true, error: null }));
                const symbols = await api.removeAccountSymbol(accountId, symbol);
                update(state => ({
                    ...state,
                    symbols,
                    loading: false
                }));
                return symbols;
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        updateSymbols: async(accountId, symbols) => {
            try {
                update(state => ({...state, loading: true, error: null }));
                const updatedSymbols = await api.updateAccountSymbols(accountId, symbols);
                update(state => ({
                    ...state,
                    symbols: updatedSymbols,
                    loading: false
                }));
                return updatedSymbols;
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        clearError: () => {
            update(state => ({...state, error: null }));
        }
    };
}

export const accountSymbolStore = createAccountSymbolStore();