import { writable } from 'svelte/store';
import { SUBSCRIPTION_TYPES } from '../config/subscription';

function createSubscriptionStore() {
  const { subscribe, set, update } = writable({
    type: SUBSCRIPTION_TYPES.BASIC,
    loading: false,
    error: null
  });

  return {
    subscribe,
    setSubscription: (type) => {
      if (!Object.values(SUBSCRIPTION_TYPES).includes(type)) {
        throw new Error('Invalid subscription type');
      }
      update(state => ({ ...state, type }));
    },
    setLoading: (loading) => {
      update(state => ({ ...state, loading }));
    },
    setError: (error) => {
      update(state => ({ ...state, error }));
    },
    reset: () => {
      set({
        type: SUBSCRIPTION_TYPES.BASIC,
        loading: false,
        error: null
      });
    }
  };
}

export const subscriptionStore = createSubscriptionStore();
