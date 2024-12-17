import { writable } from 'svelte/store';

function createCalendarStore() {
    const currentDate = new Date();
    
    const { subscribe, set } = writable({
        month: currentDate.getMonth(),
        year: currentDate.getFullYear()
    });

    return {
        subscribe,
        setDate: (month, year) => {
            set({ month, year });
        },
        reset: () => {
            const now = new Date();
            set({
                month: now.getMonth(),
                year: now.getFullYear()
            });
        }
    };
}

export const calendarStore = createCalendarStore();
