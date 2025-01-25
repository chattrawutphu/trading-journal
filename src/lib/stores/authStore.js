// src/lib/stores/authStore.js
import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';
import { subscriptionStore } from './subscriptionStore';

function createAuthStore() {
    const { subscribe, set, update } = writable({
        isAuthenticated: false,
        user: null,
        loading: true,
        error: null,
        subscriptionType: null
    });

    // เพิ่มฟังก์ชันเพื่อโหลดข้อมูล user จาก localStorage
    function loadStoredAuth() {
        if (typeof window !== 'undefined') {
            const storedAuth = localStorage.getItem('auth');
            if (storedAuth) {
                try {
                    const { user } = JSON.parse(storedAuth);
                    if (user) {
                        update(state => ({
                            ...state,
                            isAuthenticated: true,
                            user,
                            loading: false
                        }));
                        return true;
                    }
                } catch (error) {
                    console.error('Failed to parse stored auth:', error);
                }
            }
        }
        return false;
    }

    async function initializeSubscription() {
        try {
            const data = await subscriptionStore.initializeSubscription();
            update(state => ({...state, subscriptionType: data.type }));
            await subscriptionStore.loadInvoices();
        } catch (error) {
            console.error('Failed to initialize subscription:', error);
        }
    }

    return {
        subscribe,
        set,
        login: async(email, password) => {
            try {
                update(state => ({...state, loading: true, error: null }));
                const response = await api.login(email, password);

                const authData = {
                    isAuthenticated: true,
                    user: {
                        ...response.user,
                        email: response.user.email
                    },
                    loading: false,
                    error: null,
                    subscriptionType: subscriptionStore.type
                };

                // Store in localStorage
                localStorage.setItem('auth', JSON.stringify({
                    user: response.user
                }));

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
        register: async(userData) => {
            try {
                update(state => ({...state, loading: true, error: null }));
                const response = await api.register(userData);

                if (!response.verified) {
                    throw new Error('Registration verification failed');
                }

                const authData = {
                    isAuthenticated: true,
                    user: response,
                    loading: false,
                    error: null
                };

                // Store in localStorage with full user data
                localStorage.setItem('auth', JSON.stringify({
                    user: response
                }));

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
        logout: async() => {
            try {
                await api.logout();
                // Clear all auth data
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth');
                    localStorage.removeItem('selectedAccountId');
                }
                set({
                    isAuthenticated: false,
                    user: null,
                    loading: false,
                    error: null
                });
                subscriptionStore.reset();
            } catch (error) {
                console.error('Failed to logout:', error);
            }
        },
        initialize: async() => {
            try {
                // Try loading from localStorage first
                if (loadStoredAuth()) {
                    await initializeSubscription();
                    return true;
                }

                update(state => ({...state, loading: true }));
                const response = await api.getProfile();

                if (response) {
                    const authData = {
                        isAuthenticated: true,
                        user: response,
                        loading: false,
                        error: null,
                        subscriptionType: subscriptionStore.type
                    };

                    localStorage.setItem('auth', JSON.stringify({
                        user: response
                    }));

                    set(authData);
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
            update(state => ({...state, error: null }));
        }
    };
}

export const auth = createAuthStore();