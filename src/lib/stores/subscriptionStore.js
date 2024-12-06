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

    // Remove or comment out wallet-related methods since only Depay is used
    /*
    // Connect wallet and setup network
    connectWallet: async () => {
      // ...existing wallet connection code...
    },

    // Process ETH or other wallet-based payments
    processPayment: async (planType) => {
      // ...existing payment processing code...
    },
    
    processStripePayment: async (planType) => {
      // ...existing Stripe payment processing code...
    },
    */

    // Keep only the Depay payment processing method
    initiateDepayPayment: (planType) => {
      // Redirect the user to the fixed Depay payment link
      window.location.href = DEPAY_LINK;
    },

    // ยกเลิกการสมัครสมาชิก
    cancelSubscription: async () => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const data = await api.cancelSubscription();
        // รีเฟรชข้อมูลการสมัครสมาชิกเพื่อสะท้อนการยกเลิก
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

    reactivateSubscription: async () => { // Add this method if needed
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
