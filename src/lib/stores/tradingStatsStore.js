import { writable } from 'svelte/store';

// All available period options
export const PERIOD_OPTIONS = {
    today: {
        id: 'today',
        label: 'Today',
        icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    yesterday: {
        id: 'yesterday',
        label: 'Yesterday',
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    week: {
        id: 'week',
        label: 'This Week',
        icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM12 12h.01'
    },
    month: {
        id: 'month',
        label: 'This Month',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
    },
    year: {
        id: 'year',
        label: 'This Year',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
    prevWeek: {
        id: 'prevWeek',
        label: 'Previous Week',
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    prevMonth: {
        id: 'prevMonth',
        label: 'Previous Month',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
    },
    prevYear: {
        id: 'prevYear',
        label: 'Previous Year',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
    q1: {
        id: 'q1',
        label: 'Q1',
        icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    },
    q2: {
        id: 'q2',
        label: 'Q2',
        icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    },
    q3: {
        id: 'q3',
        label: 'Q3',
        icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    },
    q4: {
        id: 'q4',
        label: 'Q4',
        icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    },
    total: {
        id: 'total',
        label: 'Total',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    }
};

// Default selected periods
const DEFAULT_PERIODS = ['today', 'week', 'month', 'year', 'total'];
const STORAGE_KEY = 'tradingStats';

// Load saved periods from localStorage or use defaults
function loadSavedPeriods() {
    if (typeof window === 'undefined') return DEFAULT_PERIODS;
    
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Validate saved periods
            if (Array.isArray(parsed) && parsed.every(p => PERIOD_OPTIONS[p])) {
                return parsed;
            }
        }
    } catch (err) {
        console.error('Error loading trading stats config:', err);
    }
    return DEFAULT_PERIODS;
}

function createTradingStatsStore() {
    const { subscribe, set, update } = writable({
        selectedPeriods: loadSavedPeriods(),
        maxPeriods: 5
    });

    // Save to localStorage whenever the store updates
    subscribe(state => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state.selectedPeriods));
            } catch (err) {
                console.error('Error saving trading stats config:', err);
            }
        }
    });

    return {
        subscribe,
        
        addPeriod: (periodId) => {
            update(state => {
                if (state.selectedPeriods.length >= state.maxPeriods) return state;
                if (state.selectedPeriods.includes(periodId)) return state;
                
                return {
                    ...state,
                    selectedPeriods: [...state.selectedPeriods, periodId]
                };
            });
        },

        removePeriod: (periodId) => {
            update(state => {
                // Don't allow removing if it's the last period
                if (state.selectedPeriods.length <= 1) return state;
                
                return {
                    ...state,
                    selectedPeriods: state.selectedPeriods.filter(id => id !== periodId)
                };
            });
        },

        reorderPeriods: (periods) => {
            update(state => ({
                ...state,
                selectedPeriods: periods
            }));
        },

        reset: () => {
            set({
                selectedPeriods: DEFAULT_PERIODS,
                maxPeriods: 5
            });
        }
    };
}

export const tradingStatsStore = createTradingStatsStore();
