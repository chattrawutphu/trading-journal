// src/lib/stores/userStrategyStore.js
import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createUserStrategyStore() {
  const { subscribe, set, update } = writable({
    strategies: [],
    loading: false,
    error: null
  });

  return {
    subscribe,
    loadStrategies: async () => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const strategies = await api.getUserStrategies();
        update(state => ({
          ...state,
          strategies,
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
    addStrategy: async (strategy) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const strategies = await api.addUserStrategy(strategy);
        update(state => ({
          ...state,
          strategies,
          loading: false
        }));
        return strategies;
      } catch (error) {
        update(state => ({ 
          ...state, 
          loading: false, 
          error: error.message 
        }));
        throw error;
      }
    },
    removeStrategy: async (strategy) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const strategies = await api.removeUserStrategy(strategy);
        update(state => ({
          ...state,
          strategies,
          loading: false
        }));
        return strategies;
      } catch (error) {
        update(state => ({ 
          ...state, 
          loading: false, 
          error: error.message 
        }));
        throw error;
      }
    },
    updateStrategies: async (strategies) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const updatedStrategies = await api.updateUserStrategies(strategies);
        update(state => ({
          ...state,
          strategies: updatedStrategies,
          loading: false
        }));
        return updatedStrategies;
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

export const userStrategyStore = createUserStrategyStore();
