// src/lib/stores/tradeOptionStore.js
import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createTradeOptionStore() {
  const { subscribe, set, update } = writable({
    symbols: [],
    strategies: [],
    loading: false,
    error: null
  });

  return {
    subscribe,
    loadOptions: async () => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const [symbols, strategies] = await Promise.all([
          api.getTradeOptions('SYMBOL'),
          api.getTradeOptions('STRATEGY')
        ]);
        update(state => ({
          ...state,
          symbols,
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
    createOption: async (type, value) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const newOption = await api.createTradeOption({ type, value });
        update(state => {
          const options = type === 'SYMBOL' ? state.symbols : state.strategies;
          const updatedOptions = [...options, newOption];
          return {
            ...state,
            [type.toLowerCase() + 's']: updatedOptions,
            loading: false
          };
        });
        return newOption;
      } catch (error) {
        update(state => ({ 
          ...state, 
          loading: false, 
          error: error.message 
        }));
        throw error;
      }
    },
    updateOption: async (optionId, value) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const updatedOption = await api.updateTradeOption(optionId, { value });
        update(state => {
          const isSymbol = state.symbols.some(s => s._id === optionId);
          const options = isSymbol ? state.symbols : state.strategies;
          const updatedOptions = options.map(option => 
            option._id === optionId ? updatedOption : option
          );
          return {
            ...state,
            [isSymbol ? 'symbols' : 'strategies']: updatedOptions,
            loading: false
          };
        });
        return updatedOption;
      } catch (error) {
        update(state => ({ 
          ...state, 
          loading: false, 
          error: error.message 
        }));
        throw error;
      }
    },
    deleteOption: async (optionId) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        await api.deleteTradeOption(optionId);
        update(state => {
          const isSymbol = state.symbols.some(s => s._id === optionId);
          const options = isSymbol ? state.symbols : state.strategies;
          const updatedOptions = options.filter(option => option._id !== optionId);
          return {
            ...state,
            [isSymbol ? 'symbols' : 'strategies']: updatedOptions,
            loading: false
          };
        });
      } catch (error) {
        update(state => ({ 
          ...state, 
          loading: false, 
          error: error.message 
        }));
        throw error;
      }
    },
    incrementUsage: async (optionId) => {
      try {
        const updatedOption = await api.incrementTradeOptionUsage(optionId);
        update(state => {
          const isSymbol = state.symbols.some(s => s._id === optionId);
          const options = isSymbol ? state.symbols : state.strategies;
          const updatedOptions = options.map(option => 
            option._id === optionId ? updatedOption : option
          );
          return {
            ...state,
            [isSymbol ? 'symbols' : 'strategies']: updatedOptions
          };
        });
        return updatedOption;
      } catch (error) {
        console.error('Failed to increment option usage:', error);
        throw error;
      }
    },
    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
}

export const tradeOptionStore = createTradeOptionStore();
