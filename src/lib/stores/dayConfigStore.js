import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createDayConfigStore() {
    const { subscribe, set, update } = writable({
        config: null,
        loading: false,
        error: null
    });

    let currentConfig = null;

    return {
        subscribe,
        loadConfig: async (accountId, date) => {
            try {
                if (currentConfig && 
                    currentConfig.account === accountId && 
                    currentConfig.date === date) {
                    return currentConfig;
                }

                update(state => ({ ...state, loading: true, error: null }));
                const config = await api.getDayConfig(accountId, date);
                currentConfig = config;
                update(state => ({
                    ...state,
                    config,
                    loading: false
                }));
                return config;
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        saveConfig: async (data) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const config = await api.createDayConfig(data);
                update(state => ({
                    ...state,
                    config,
                    loading: false
                }));
                return config;
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        updateConfig: async (accountId, date, data) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const config = await api.updateDayConfig(accountId, date, data);
                update(state => ({
                    ...state,
                    config,
                    loading: false
                }));
                return config;
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        toggleFavorite: async (accountId, date) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const config = await api.toggleDayFavorite(accountId, date);
                update(state => ({
                    ...state,
                    config,
                    loading: false
                }));
                return config;
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
            update(state => ({ ...state, error: null }));
        }
    };
}

export const dayConfigStore = createDayConfigStore(); 