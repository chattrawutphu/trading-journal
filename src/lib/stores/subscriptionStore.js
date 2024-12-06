import { writable } from 'svelte/store';
import { SUBSCRIPTION_TYPES, DEPAY_PUBLIC_KEY } from '../config/subscription';
import { api } from '../utils/api';

const DEPAY_LINK = 'https://link.depay.com/20Fh2IraACfqJyeDQzlizr';

function createSubscriptionStore() {
  const { subscribe, set, update } = writable({
    type: SUBSCRIPTION_TYPES.BASIC,
    status: 'active',
    startDate: null,
    endDate: null,
    loading: false,
    error: null,
    paymentStatus: '',
    transactionHash: null,
    invoices: []
  });

  const store = {
    subscribe,
    
    setLoading: (loading) => update(state => ({ ...state, loading })),
    setError: (error) => update(state => ({ ...state, error })),
    setPaymentStatus: (status) => update(state => ({ ...state, paymentStatus: status })),
    
    // Initialize subscription state
    initializeSubscription: async () => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const data = await api.getSubscriptionStatus();
        update(state => ({
          ...state,
          ...data,
          loading: false
        }));
        return data;
      } catch (error) {
        update(state => ({ ...state, loading: false, error: error.message }));
        throw error;
      }
    },

    // Load invoices
    loadInvoices: async () => {
      try {
        const response = await api.getInvoices();
        update(state => ({ ...state, invoices: response.invoices || [] }));
        return response;
      } catch (error) {
        update(state => ({ ...state, error: error.message }));
        throw error;
      }
    },

    // Download invoice
    downloadInvoice: async (invoiceId) => {
      try {
        return await api.downloadInvoice(invoiceId);
      } catch (error) {
        update(state => ({ ...state, error: error.message }));
        throw error;
      }
    },

    // Keep only the Depay payment processing method
    initiateDepayPayment: async (planType) => {
      try {
        update(state => ({ ...state, loading: true, paymentStatus: 'Redirecting to Depay...' }));
        
        const response = await api.createDepayTransaction(planType);
        const { txHash } = response;

        if (!txHash) {
          throw new Error('Failed to initiate Depay transaction.');
        }

        // Redirect the user to Depay's payment page with necessary query parameters
        const redirectUrl = `${DEPAY_LINK}`;
        window.location.href = redirectUrl;
      } catch (error) {
        console.error('Depay payment initiation failed:', error);
        update(state => ({ ...state, loading: false, error: error.message }));
      }
    },

    // Confirm payment (if needed separately)
    confirmPayment: async (planType, txHash, signature) => {
      try {
        update(state => ({ ...state, loading: true, paymentStatus: 'Confirming payment...' }));
        const response = await api.confirmPayment(planType, txHash, signature);
        
        if (response.success) {
          await store.initializeSubscription();
          update(state => ({ ...state, loading: false, paymentStatus: 'Subscription activated.' }));
          alert('Payment confirmed and subscription activated!');
        }
      } catch (error) {
        console.error('Payment confirmation failed:', error);
        update(state => ({ ...state, loading: false, error: error.message }));
      }
    },

    // Existing cancel and reactivate methods
    cancelSubscription: async () => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const data = await api.cancelSubscription();
        // Refresh subscription data
        await store.initializeSubscription();
        update(state => ({
          ...state,
          status: 'cancelled',
          cancelAt: data.cancelAt,
          loading: false
        }));
        return data;
      } catch (error) {
        update(state => ({ ...state, loading: false, error: error.message }));
        throw error;
      }
    },

    reactivateSubscription: async () => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const data = await api.reactivateSubscription();
        await store.initializeSubscription();
        update(state => ({
          ...state,
          status: 'active',
          cancelAt: null,
          loading: false
        }));
        return data;
      } catch (error) {
        update(state => ({ ...state, loading: false, error: error.message }));
        throw error;
      }
    },

    reset: () => {
      set({
        type: SUBSCRIPTION_TYPES.BASIC,
        status: 'active',
        startDate: null,
        endDate: null,
        loading: false,
        error: null,
        paymentStatus: '',
        transactionHash: null,
        invoices: []
      });
    }
  };

  return store;
}

// Helper functions
function getPriceForPlan(planType) {
  const prices = {
    [SUBSCRIPTION_TYPES.BASIC]: 0,
    [SUBSCRIPTION_TYPES.PRO]: 0.01,      // เปลี่ยนราคาตามต้องการ
    [SUBSCRIPTION_TYPES.PRO_PLUS]: 0.02  // เปลี่ยนราคาตามต้องการ
  };
  return prices[planType];
}

export const subscriptionStore = createSubscriptionStore();
