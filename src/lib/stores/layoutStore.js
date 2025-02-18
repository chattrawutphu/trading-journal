import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createLayoutStore() {
    const { subscribe, set, update } = writable({
        layouts: [],
        loading: false,
        error: null
    });

    return {
        subscribe,
        set,
        update,
        async loadLayouts() {
            try {
                update(state => ({ ...state, loading: true, error: null }));

                // Check localStorage first
                const cachedData = localStorage.getItem('dashboardLayouts');
                const cacheTimestamp = localStorage.getItem('dashboardLayoutsTimestamp');
                const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
                const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

                // Use cache if it exists and is not expired
                if (cachedData && cacheAge < CACHE_DURATION) {
                    set({ 
                        layouts: JSON.parse(cachedData),
                        loading: false,
                        error: null
                    });
                    return JSON.parse(cachedData);
                }

                // If cache is expired or doesn't exist, fetch from API
                const layouts = await api.getLayouts();

                // Update localStorage with new data and timestamp
                localStorage.setItem('dashboardLayouts', JSON.stringify(layouts));
                localStorage.setItem('dashboardLayoutsTimestamp', Date.now().toString());

                set({ 
                    layouts,
                    loading: false,
                    error: null
                });
                return layouts;
            } catch (error) {
                console.error('Error loading layouts:', error);
                update(state => ({ ...state, error: error.message, loading: false }));
                return [];
            }
        },

        async saveLayouts(layouts) {
            try {
                console.log('💾 Saving layouts to database and cache...', {
                    layoutCount: layouts.length,
                    layouts: layouts.map(l => ({
                        name: l.name,
                        widgetCount: l.widgets?.length || 0
                    }))
                });

                // Validate layouts before saving
                if (!Array.isArray(layouts)) {
                    throw new Error('Invalid layouts format');
                }

                // Save to API
                const response = await api.saveLayouts(layouts);
                console.log('✅ Layouts saved to database', response);

                if (response.layouts) {
                    // Update localStorage with confirmed layouts from server
                    localStorage.setItem('dashboardLayouts', JSON.stringify(response.layouts));
                    localStorage.setItem('dashboardLayoutsTimestamp', Date.now().toString());
                    console.log('📦 Updated localStorage cache');

                    set({ 
                        layouts: response.layouts,
                        loading: false,
                        error: null
                    });
                    console.log('🔄 Layout store updated');
                }
            } catch (error) {
                console.error('❌ Error saving layouts:', error);
                update(state => ({ 
                    ...state, 
                    error: error.message || 'Failed to save layouts',
                    loading: false 
                }));
                throw error;
            }
        }
    };
}

export const layoutStore = createLayoutStore();