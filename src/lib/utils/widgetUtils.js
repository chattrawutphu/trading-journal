import { writable } from 'svelte/store';

export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function createUniqueId(baseType) {
    return `${baseType}_${generateUUID()}`;
}

export function getWidgetTypeCount(widgets, baseType) {
    return widgets.filter(w => w.id.startsWith(baseType)).length;
}

export function getDefaultConfig(widgetType) {
    const defaultConfigs = {
        TradingStats: {
            cols: 'auto',
            rows: 'auto',
            textSize: 'medium',
            disabled: { cols: true, rows: true }
        },
        StatsCards: {
            cols: 2,
            rows: 10,
            textSize: 'medium',
            disabled: { cols: false, rows: false }
        },
        TradeCalendar: {
            cols: 10,
            rows: 10,
            textSize: 'medium',
            disabled: { cols: false, rows: false }
        },
        MonthTradeCalendar: {
            cols: 6,
            rows: 8,
            textSize: 'medium',
            disabled: { cols: false, rows: false }
        },
        TradeChart: {
            cols: 6,
            rows: 8,
            textSize: 'medium',
            disabled: { cols: false, rows: false }
        },
        ProfitTargetWidget: {
            cols: 6,
            rows: 'auto',
            textSize: 'medium',
            period: 'daily',
            target: 1000,
            disabled: { cols: false, rows: true }
        },
        OpenPositionsWidget: {
            cols: 4,
            rows: 8,
            textSize: 'medium',
            disabled: { cols: false, rows: false }
        },
        ShortCalendar: {
            cols: 12,
            rows: 'auto',
            textSize: 'medium',
            disabled: { cols: false, rows: false },
            height: 'auto'
        }
    };

    return defaultConfigs[widgetType] || {
        cols: 1,
        rows: 1,
        textSize: 'medium',
        disabled: { cols: false, rows: false }
    };
}

export const widgetLimits = {
    TradeCalendar: 1,
    MonthTradeCalendar: 1,
    TradeChart: 1,
    StatsCards: 1,
    TradingStats: 1,
    ProfitTargetWidget: 3,
    OpenPositionsWidget: 1,
    ShortCalendar: 1
};

export function getWidgetDescription(widgetId) {
    const descriptions = {
        TradingStats: {
            title: "Trading Statistics Overview",
            description: "Displays key trading metrics across different time periods. Shows profit/loss, number of trades, and performance percentages for daily, weekly, monthly, and yearly periods.",
            features: [
                "Multiple time period views",
                "Real-time P&L tracking",
                "Performance percentage calculations",
                "Trade count statistics"
            ]
        },
        StatsCards: {
            title: "Trading Performance Cards",
            description: "A comprehensive view of your trading performance metrics in an easy-to-read card format.",
            features: [
                "Total profit/loss display",
                "Open positions counter",
                "Total trades tracker",
                "Win rate percentage"
            ]
        },
        TradeCalendar: {
            title: "Daily Trading Calendar",
            description: "A detailed calendar view showing your daily trading activity with color-coded performance indicators.",
            features: [
                "Daily profit/loss tracking",
                "Trade entry/exit visualization",
                "Transaction history integration",
                "Color-coded performance indicators"
            ]
        },
        MonthTradeCalendar: {
            title: "Monthly Trading Overview",
            description: "Aggregated monthly view of your trading performance with detailed statistics for each month.",
            features: [
                "Monthly performance summary",
                "Win rate statistics",
                "Total P&L per month",
                "Trade volume tracking"
            ]
        },
        TradeChart: {
            title: "Performance Chart",
            description: "Interactive chart displaying your trading performance over time with detailed analytics.",
            features: [
                "Performance trend visualization",
                "Profit/loss tracking over time",
                "Interactive data points",
                "Custom date range selection"
            ]
        },
        ProfitTargetWidget: {
            title: "Profit Goal Tracker",
            description: "Visual progress tracker for your trading profit goals with customizable time periods.",
            features: [
                "Customizable profit targets",
                "Multiple timeframe options",
                "Progress visualization",
                "Real-time goal tracking"
            ]
        },
        OpenPositionsWidget: {
            title: "Active Trades Monitor",
            description: "Real-time monitor for your currently open trading positions with key position details.",
            features: [
                "Live position tracking",
                "Key position metrics",
                "Scrollable position list",
                "Quick position overview"
            ]
        },
        ShortCalendar: {
            title: "Quick Calendar View",
            description: "A compact calendar view showing trading activity for the past few days with quick navigation.",
            features: [
                "12-day view with today highlighted",
                "Quick navigation between days",
                "Trade performance indicators",
                "Daily profit/loss tracking"
            ]
        }
    };

    return descriptions[widgetId] || {
        title: "Widget",
        description: "No description available.",
        features: []
    };
}

export function generateSampleProps(widgetType) {
    const now = new Date();
    const sampleTrades = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        const isWin = Math.random() > 0.4;
        const pnlValue = isWin ?
            Math.floor(Math.random() * 2000) + 100 :
            -(Math.floor(Math.random() * 1000) + 50);

        const isClosed = Math.random() > 0.3;
        const entryPrice = Math.floor(Math.random() * 500) + 100;
        const quantity = Math.floor(Math.random() * 100) + 10;
        const leverage = [1, 2, 5, 10][Math.floor(Math.random() * 4)];

        return {
            id: `sample-${i}`,
            symbol: ['AAPL', 'TSLA', 'GOOGL', 'META', 'NVDA', 'AMD', 'MSFT', 'AMZN'][Math.floor(Math.random() * 8)],
            entryDate: date.toISOString(),
            exitDate: isClosed ? date.toISOString() : null,
            entryPrice,
            exitPrice: isClosed ? entryPrice * (isWin ? 1.1 : 0.9) : null,
            quantity,
            pnl: isClosed ? pnlValue : null,
            status: isClosed ? 'CLOSED' : 'OPEN',
            type: ['LONG', 'SHORT'][Math.floor(Math.random() * 2)],
            leverage,
            fees: (quantity * entryPrice * 0.001),
            date: date.toISOString(),
            high: entryPrice * 1.1,
            low: entryPrice * 0.9,
            close: isClosed ? entryPrice * (isWin ? 1.1 : 0.9) : entryPrice,
            volume: quantity
        };
    });

    const closedTrades = sampleTrades.filter(t => t.status === 'CLOSED');
    const openTrades = sampleTrades.filter(t => t.status === 'OPEN');
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = closedTrades.filter(t => t.pnl > 0);
    const winRate = (winningTrades.length / closedTrades.length) * 100;

    const sampleData = {
        TradingStats: {
            trades: sampleTrades,
            periodStats: {
                daily: sampleTrades.slice(0, 1),
                weekly: sampleTrades.slice(0, 7),
                monthly: sampleTrades.slice(0, 30),
                quarterly: sampleTrades,
                yearly: sampleTrades
            }
        },
        StatsCards: {
            totalPnL,
            openTrades,
            closedTrades,
            winRate
        },
        TradeCalendar: {
            trades: sampleTrades,
            accountId: 'preview-account'
        },
        MonthTradeCalendar: {
            trades: sampleTrades,
            accountId: 'preview-account'
        },
        TradeChart: {
            openTrades,
            closedTrades
        },
        ProfitTargetWidget: {
            trades: sampleTrades,
            period: 'daily',
            target: 1000
        },
        OpenPositionsWidget: {
            trades: openTrades
        }
    };

    return sampleData[widgetType] || {};
}

export function calculateWidgetHeight(rows) {
    return rows * 70; // Each row is 70px
}

export function calculateWidgetWidth(cols) {
    return cols * 70; // Each column is 70px
}

export function getBaseWidgetType(widgetId) {
    return widgetId.split('_')[0];
}

export function calculateHeight(rows) {
    return rows === 'auto' ? 'auto' : rows * 70;
}

// Trading Stats Period Options
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
        icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    month: {
        id: 'month',
        label: 'This Month',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
    },
    prevMonth: {
        id: 'prevMonth',
        label: 'Previous Month',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
    },
    year: {
        id: 'year',
        label: 'This Year',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
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

const DEFAULT_PERIODS = ['today', 'week', 'month', 'prevMonth', 'year', 'total'];
const TRADING_STATS_STORAGE_KEY = 'tradingStats';
const MAX_PERIODS = 6;

// Load saved periods from localStorage or use defaults
function loadSavedPeriods() {
    if (typeof window === 'undefined') return DEFAULT_PERIODS;

    try {
        const saved = localStorage.getItem(TRADING_STATS_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.every(p => PERIOD_OPTIONS[p])) {
                return parsed;
            }
        }
    } catch (err) {
        console.error('Error loading trading stats config:', err);
    }
    return DEFAULT_PERIODS;
}

// Create trading stats config store
function createTradingStatsConfig() {
    const { subscribe, set, update } = writable({
        selectedPeriods: loadSavedPeriods(),
        maxPeriods: MAX_PERIODS
    });

    subscribe(state => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(TRADING_STATS_STORAGE_KEY, JSON.stringify(state.selectedPeriods));
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
                maxPeriods: MAX_PERIODS
            });
        }
    };
}

export const tradingStatsConfig = createTradingStatsConfig();

// เพิ่ม default layout configuration
export const DEFAULT_LAYOUT_CONFIG = {
    name: 'Default',
    widgets: [{
            type: 'ProfitTargetWidget',
            config: {
                period: 'daily',
                target: 100,
            }
        }, {
            type: 'ProfitTargetWidget',
            config: {
                period: 'yearly',
                target: 500,
            }
        }, {
            type: 'TradingStats'
        },
        {
            type: 'StatsCards',
        },
        {
            type: 'TradeCalendar'
        },
        {
            type: 'TradeChart'
        },
        {
            type: 'OpenPositionsWidget'
        }
    ]
};

// Helper function to create default widgets with unique IDs
export function createDefaultLayout() {
    return {
        name: DEFAULT_LAYOUT_CONFIG.name,
        widgets: DEFAULT_LAYOUT_CONFIG.widgets.map(widget => ({
            id: createUniqueId(widget.type),
            config: {
                ...getDefaultConfig(widget.type),
                ...(widget.config || {}) // merge with custom config if exists
            }
        }))
    };
}