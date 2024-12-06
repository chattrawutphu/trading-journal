import { writable } from 'svelte/store';
import { SUBSCRIPTION_TYPES } from '../config/subscription';
import { api } from '../utils/api';
import { mockPayment } from '../services/mockPayment';

function createSubscriptionStore() {
  const { subscribe, set, update } = writable({
    type: SUBSCRIPTION_TYPES.BASIC,
    status: 'active',
    startDate: null,
    endDate: null,
    loading: false,
    error: null,
    invoices: [],
    paymentMethod: null
  });

  return {
    subscribe,
    setLoading: (loading) => {
      update(state => ({ ...state, loading }));
    },
    setError: (error) => {
      update(state => ({ ...state, error }));
    },
    
    // Initialize subscription state
    initializeSubscription: async () => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const data = await api.getSubscriptionStatus();
        update(state => ({
          ...state,
          ...data,
          amount: data.amount,
          loading: false
        }));
        return data;
      } catch (error) {
        update(state => ({ ...state, loading: false, error: error.message }));
        throw error;
      }
    },

    // Create new subscription
    createSubscription: async (planType) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const data = await api.createSubscription(planType);
        update(state => ({
          ...state,
          type: planType,
          status: 'active',
          startDate: data.startDate,
          endDate: data.endDate,
          loading: false,
          paymentMethod: data.paymentMethod
        }));
        return data;
      } catch (error) {
        update(state => ({ ...state, loading: false, error: error.message }));
        throw error;
      }
    },

    // Cancel subscription
    cancelSubscription: async () => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const data = await api.cancelSubscription();
        update(state => ({
          ...state,
          status: 'cancelled',
          cancelAt: data.cancelAt,
          loading: false
        }));
      } catch (error) {
        update(state => ({ ...state, loading: false, error: error.message }));
        throw error;
      }
    },

    // Load invoices
    loadInvoices: async () => {
      try {
        const invoices = await api.getInvoices();
        update(state => ({ ...state, invoices }));
        return invoices;
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

    processStripePayment: async (planType) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        
        // Simulate Stripe payment
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const paymentResult = {
          success: true,
          type: 'stripe',
          brand: 'visa',
          last4: '4242'
        };
        
        const subscriptionData = await api.processPayment(planType, paymentResult);

        update(state => ({
          ...state,
          ...subscriptionData.subscription,
          loading: false
        }));

        return subscriptionData;
      } catch (error) {
        update(state => ({ ...state, loading: false, error: error.message }));
        throw error;
      }
    },

    processMetaMaskPayment: async (planType) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        
        // Simulate MetaMask payment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const paymentResult = {
          success: true,
          type: 'metamask',
          brand: 'ethereum',
          last4: '0x12'
        };
        
        const subscriptionData = await api.processPayment(planType, paymentResult);

        update(state => ({
          ...state,
          ...subscriptionData.subscription,
          loading: false
        }));

        return subscriptionData;
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
        invoices: [],
        paymentMethod: null
      });
    }
  };
}

export const subscriptionStore = createSubscriptionStore();
