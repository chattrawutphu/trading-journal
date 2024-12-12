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
        
        // Get saved account ID
        const savedAccountId = typeof window !== 'undefined' ? localStorage.getItem('selectedAccountId') : null;
        
        // If there are accounts, fetch the saved account or first one's details
        let currentAccount = null;
        if (accounts.length > 0) {
          // Find the saved account in the accounts list
          const accountToLoad = savedAccountId ? 
            accounts.find(a => a._id === savedAccountId) : null;
            
          // If saved account exists in accounts list, use it, otherwise use first account
          const targetAccount = accountToLoad || accounts[0];
          currentAccount = await api.getAccount(targetAccount._id);
          
          // Save the current account ID
          if (typeof window !== 'undefined') {
            localStorage.setItem('selectedAccountId', currentAccount._id);
          }
        }
        
        update(state => ({
          ...state,
          accounts,
          loading: false,
          currentAccount,
          initialLoadComplete: true
        }));

        return currentAccount;
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
        
        // Save the current account ID
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedAccountId', accountId);
        }
        
        update(state => ({
          ...state,
          currentAccount: account,
          loading: false,
          error: null
        }));
        return account;
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
        
        // Save the current account ID
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedAccountId', accountWithBalance._id);
        }
        
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
          const newCurrentAccount = state.currentAccount?._id === accountId ? (updatedAccounts[0] || null) : state.currentAccount;
          
          // Update localStorage if current account is deleted
          if (typeof window !== 'undefined') {
            if (state.currentAccount?._id === accountId) {
              if (newCurrentAccount) {
                localStorage.setItem('selectedAccountId', newCurrentAccount._id);
              } else {
                localStorage.removeItem('selectedAccountId');
              }
            }
          }

          return {
            ...state,
            accounts: updatedAccounts,
            currentAccount: newCurrentAccount,
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
    },
    getCachedAccount: () => {
      let cachedAccount;
      subscribe(value => {
        cachedAccount = value.currentAccount;
      })();
      return cachedAccount;
    }
  };
}

export const accountStore = createAccountStore();
