// src/lib/stores/authStore.js
import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';
import { subscriptionStore } from './subscriptionStore';

function createAuthStore() {
    const { subscribe, set, update } = writable({
        isAuthenticated: false,
        user: null,
        loading: true,  // เริ่มต้นด้วย loading true
        error: null,
        subscriptionType: null // Add subscriptionType to the state
    });

    async function initializeSubscription() {
        try {
            const data = await subscriptionStore.initializeSubscription();
            update(state => ({ ...state, subscriptionType: data.type }));
            await subscriptionStore.loadInvoices();
        } catch (error) {
            console.error('Failed to initialize subscription:', error);
        }
    }

    return {
        subscribe,
        set,
        login: async (identifier, password) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const response = await api.login(identifier, password);
                
                const authData = {
                    isAuthenticated: true,
                    user: {
                        ...response.user,
                        // No need to add username since we'll format it from email in the component
                    },
                    loading: false,
                    error: null,
                    subscriptionType: subscriptionStore.type
                };

                set(authData);
                await initializeSubscription();
                return response;
            } catch (error) {
                update(state => ({ 
                    ...state, 
                    loading: false, 
                    error: error.message,
                    isAuthenticated: false,
                    user: null
                }));
                throw error;
            }
        },
        register: async (userData) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const response = await api.register(userData);
                
                const authData = {
                    isAuthenticated: true,
                    user: response.user,
                    loading: false,
                    error: null
                };

                // Store in localStorage
                localStorage.setItem('auth', JSON.stringify({
                    user: response.user,
                    token: response.token
                }));

                // Set cookie for server-side auth
                document.cookie = `auth=${response.token}; path=/; max-age=86400; samesite=strict`;

                set(authData);

                // Initialize subscription after successful registration
                await initializeSubscription();

                return response;
            } catch (error) {
                update(state => ({ 
                    ...state, 
                    loading: false, 
                    error: error.message,
                    isAuthenticated: false,
                    user: null
                }));
                throw error;
            }
        },
        logout: async () => {
            try {
                await api.logout();
                // Clear selected account ID from localStorage
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('selectedAccountId');
                }
                set({
                    isAuthenticated: false,
                    user: null,
                    loading: false,
                    error: null
                });
                // Reset subscription store
                subscriptionStore.reset();
            } catch (error) {
                console.error('Failed to logout:', error);
            }
        },
        initialize: async () => {
            try {
                const response = await api.getProfile();
                if (response) {
                    set({
                        isAuthenticated: true,
                        user: response,
                        loading: false,
                        error: null,
                        subscriptionType: subscriptionStore.type // Set subscriptionType
                    });

                    // Initialize subscription after profile initialization
                    await initializeSubscription();

                    return true;
                }
                set({ isAuthenticated: false, user: null, loading: false, error: null });
                return false;
            } catch (error) {
                console.error('Failed to initialize auth:', error);
                set({ isAuthenticated: false, user: null, loading: false, error: null });
                return false;
            }
        },
        clearError: () => {
            update(state => ({ ...state, error: null }));
        }
    };
}

export const auth = createAuthStore();
