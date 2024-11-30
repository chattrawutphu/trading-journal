// src/lib/stores/accountStore.js
import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createAccountStore() {
  const { subscribe, set, update } = writable({
    accounts: [],
    currentAccount: null,
    loading: false,
    error: null
  });

  return {
    subscribe,
    loadAccounts: async () => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const accounts = await api.getAccounts();
        update(state => ({
          ...state,
          accounts,
          loading: false,
          currentAccount: accounts[0] || null
        }));
      } catch (error) {
        console.error('Error loading accounts:', error);
        update(state => ({ 
          ...state, 
          loading: false, 
          error: error.message || 'Failed to load accounts'
        }));
        throw error;
      }
    },
    setCurrentAccount: (accountId) => {
      update(state => {
        const account = state.accounts.find(a => a._id === accountId);
        return {
          ...state,
          currentAccount: account,
          error: null
        };
      });
    },
    createAccount: async (accountData) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const newAccount = await api.createAccount(accountData);
        update(state => {
          const updatedAccounts = [...state.accounts, newAccount];
          return {
            ...state,
            accounts: updatedAccounts,
            currentAccount: newAccount,
            loading: false
          };
        });
        return newAccount;
      } catch (error) {
        console.error('Error creating account:', error);
        update(state => ({ 
          ...state, 
          loading: false, 
          error: error.message || 'Failed to create account'
        }));
        throw error;
      }
    },
    updateAccount: async (accountId, accountData) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const updatedAccount = await api.updateAccount(accountId, accountData);
        update(state => {
          const updatedAccounts = state.accounts.map(account => 
            account._id === accountId ? updatedAccount : account
          );
          return {
            ...state,
            accounts: updatedAccounts,
            currentAccount: state.currentAccount?._id === accountId ? updatedAccount : state.currentAccount,
            loading: false
          };
        });
        return updatedAccount;
      } catch (error) {
        console.error('Error updating account:', error);
        update(state => ({ 
          ...state, 
          loading: false, 
          error: error.message || 'Failed to update account'
        }));
        throw error;
      }
    },
    deleteAccount: async (accountId) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        await api.deleteAccount(accountId);
        update(state => {
          const updatedAccounts = state.accounts.filter(a => a._id !== accountId);
          return {
            ...state,
            accounts: updatedAccounts,
            currentAccount: state.currentAccount?._id === accountId ? (updatedAccounts[0] || null) : state.currentAccount,
            loading: false
          };
        });
      } catch (error) {
        console.error('Error deleting account:', error);
        update(state => ({ 
          ...state, 
          loading: false, 
          error: error.message || 'Failed to delete account'
        }));
        throw error;
      }
    },
    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
}

export const accountStore = createAccountStore();
