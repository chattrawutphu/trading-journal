// src/lib/stores/authStore.js
import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createAuthStore() {
    const { subscribe, set, update } = writable({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
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
        logout: () => {
            // Clear localStorage
            localStorage.removeItem('auth');

            // Clear cookie
            document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            // Reset store
            set({
                isAuthenticated: false,
                user: null,
                token: null,
                loading: false,
                error: null
            });
        },
        initialize: () => {
            try {
                const storedAuth = localStorage.getItem('auth');
                if (storedAuth) {
                    const { user, token } = JSON.parse(storedAuth);
                    if (user && token) {
                        set({
                            isAuthenticated: true,
                            user,
                            token,
                            loading: false,
                            error: null
                        });
                        return true;
                    }
                }
                return false;
            } catch (error) {
                console.error('Failed to initialize auth:', error);
                return false;
            }
        },
        clearError: () => {
            update(state => ({ ...state, error: null }));
        }
    };
}

export const auth = createAuthStore();
