// src/lib/stores/authStore.js
import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createAuthStore() {
    const { subscribe, set, update } = writable({
        isAuthenticated: false,
        user: null,
        loading: true,  // เริ่มต้นด้วย loading true
        error: null
    });

    return {
        subscribe,
        set,
        login: async (email, password) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const response = await api.login(email, password);
                
                const authData = {
                    isAuthenticated: true,
                    user: response.user,
                    loading: false,
                    error: null
                };

                set(authData);
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
                    token: response.token,
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
                return response;
            } catch (error) {
                update(state => ({ 
                    ...state, 
                    loading: false, 
                    error: error.message,
                    isAuthenticated: false,
                    user: null,
                    token: null
                }));
                throw error;
            }
        },
        logout: async () => {
            try {
                await api.logout();
                set({
                    isAuthenticated: false,
                    user: null,
                    loading: false,
                    error: null
                });
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
                        error: null
                    });
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
