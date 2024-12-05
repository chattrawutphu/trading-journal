import { writable } from 'svelte/store';

const STORAGE_KEY = 'calendarDate';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

function loadSavedDate() {
    if (typeof window === 'undefined') return null;
    
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const { month, year, timestamp } = JSON.parse(saved);
            // Check if cache is still valid (within 30 minutes)
            if (Date.now() - timestamp < CACHE_DURATION) {
                return { month, year };
            }
        }
    } catch (err) {
        console.error('Error loading calendar date:', err);
    }
    return null;
}

function createCalendarStore() {
    const currentDate = new Date();
    const savedDate = loadSavedDate();
    
    const { subscribe, set } = writable({
        month: savedDate?.month ?? currentDate.getMonth(),
        year: savedDate?.year ?? currentDate.getFullYear()
    });

    return {
        subscribe,
        setDate: (month, year) => {
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({
                        month,
                        year,
                        timestamp: Date.now()
                    }));
                } catch (err) {
                    console.error('Error saving calendar date:', err);
                }
            }
            set({ month, year });
        },
        reset: () => {
            const now = new Date();
            if (typeof window !== 'undefined') {
                try {
                    localStorage.removeItem(STORAGE_KEY);
                } catch (err) {
                    console.error('Error removing calendar date:', err);
                }
            }
            set({
                month: now.getMonth(),
                year: now.getFullYear()
            });
        }
    };
}

export const calendarStore = createCalendarStore();
