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
        
        // If there are accounts, fetch the first one's details to get actual balance
        let currentAccount = null;
        if (accounts.length > 0) {
          currentAccount = await api.getAccount(accounts[0]._id);
        }
        
        update(state => ({
          ...state,
          accounts,
          loading: false,
          currentAccount
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
    setCurrentAccount: async (accountId) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const account = await api.getAccount(accountId);
        update(state => ({
          ...state,
          currentAccount: account,
          loading: false,
          error: null
        }));
      } catch (error) {
        console.error('Error setting current account:', error);
        update(state => ({
          ...state,
          loading: false,
          error: error.message || 'Failed to load account details'
        }));
        throw error;
      }
    },
    createAccount: async (accountData) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const newAccount = await api.createAccount(accountData);
        // Fetch full account details including actual balance
        const accountWithBalance = await api.getAccount(newAccount._id);
        update(state => {
          const updatedAccounts = [...state.accounts, newAccount];
          return {
            ...state,
            accounts: updatedAccounts,
            currentAccount: accountWithBalance,
            loading: false
          };
        });
        return accountWithBalance;
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
        // Fetch full account details including actual balance
        const accountWithBalance = await api.getAccount(accountId);
        update(state => {
          const updatedAccounts = state.accounts.map(account => 
            account._id === accountId ? updatedAccount : account
          );
          return {
            ...state,
            accounts: updatedAccounts,
            currentAccount: state.currentAccount?._id === accountId ? accountWithBalance : state.currentAccount,
            loading: false
          };
        });
        return accountWithBalance;
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
    updateBalance: async (accountId, balance) => {
      try {
        update(state => ({ ...state, loading: true, error: null }));
        const updatedAccount = await api.updateBalance(accountId, balance);
        // Fetch full account details including actual balance
        const accountWithBalance = await api.getAccount(accountId);
        update(state => {
          const updatedAccounts = state.accounts.map(account => 
            account._id === accountId ? updatedAccount : account
          );
          return {
            ...state,
            accounts: updatedAccounts,
            currentAccount: state.currentAccount?._id === accountId ? accountWithBalance : state.currentAccount,
            loading: false
          };
        });
        return accountWithBalance;
      } catch (error) {
        console.error('Error updating balance:', error);
        update(state => ({ 
          ...state, 
          loading: false, 
          error: error.message || 'Failed to update balance'
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
