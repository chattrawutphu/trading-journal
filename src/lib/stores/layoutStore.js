import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createLayoutStore() {
    const { subscribe, set, update } = writable([]);

    return {
        subscribe,
        set,
        update,
        async loadLayouts() {
            try {
                // Check localStorage first
                const cachedData = localStorage.getItem('dashboardLayouts');
                const cacheTimestamp = localStorage.getItem('dashboardLayoutsTimestamp');
                const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
                const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

                // Use cache if it exists and is not expired
                if (cachedData && cacheAge < CACHE_DURATION) {
                    set(JSON.parse(cachedData));
                    return JSON.parse(cachedData);
                }

                // If cache is expired or doesn't exist, fetch from API
                const layouts = await api.getLayouts();

                // Update localStorage with new data and timestamp
                localStorage.setItem('dashboardLayouts', JSON.stringify(layouts));
                localStorage.setItem('dashboardLayoutsTimestamp', Date.now().toString());

                set(layouts);
                return layouts;
            } catch (error) {
                console.error('Error loading layouts:', error);
                return [];
            }
        },

        async saveLayouts(layouts) {
            try {
                console.log('💾 Saving layouts to database and cache...', {
                    layoutCount: layouts.length,
                    layouts: layouts.map(l => ({
                        name: l.name,
                        widgetCount: l.widgets.length
                    }))
                });

                // Save to API
                await api.saveLayouts(layouts);
                console.log('✅ Layouts saved to database');

                // Update localStorage
                localStorage.setItem('dashboardLayouts', JSON.stringify(layouts));
                localStorage.setItem('dashboardLayoutsTimestamp', Date.now().toString());
                console.log('📦 Updated localStorage cache');

                set(layouts);
                console.log('🔄 Layout store updated');
            } catch (error) {
                console.error('❌ Error saving layouts:', error);
                throw error;
            }
        }
    };
}

export const layoutStore = createLayoutStore();