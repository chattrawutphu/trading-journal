// src/lib/stores/userSettingsStore.js
import { writable } from 'svelte/store';
import { api } from '$lib/utils/api';

function createUserSettingsStore() {
    const { subscribe, set, update } = writable({
        profile: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            defaultCurrency: 'USD'
        },
        riskManagement: {
            maxRiskPerTrade: 1,
            maxDailyLoss: 3,
            maxPositions: 5,
            defaultStopLoss: 2,
            defaultTakeProfit: 6,
            enableRiskWarnings: true
        },
        tradingRules: [],
        notifications: {
            emailAlerts: true,
            tradeUpdates: true,
            riskWarnings: true,
            performanceReports: true,
            marketNews: false
        },
        display: {
            theme: 'dark',
            chartType: 'candlestick',
            defaultTimeframe: 'D'
        },
        tradingHours: {
            enabled: false,
            startTime: '09:30',
            endTime: '16:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        },
        journalTemplates: [],
        customIndicators: [],
        exportPreferences: {
            defaultFormat: 'csv',
            includeImages: true,
            dateFormat: 'YYYY-MM-DD'
        },
        loading: false,
        error: null
    });

    return {
        subscribe,
        loadSettings: async () => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const settings = await api.getUserSettings();
                update(state => ({
                    ...settings,
                    loading: false
                }));
            } catch (error) {
                update(state => ({ 
                    ...state, 
                    loading: false, 
                    error: error.message 
                }));
                throw error;
            }
        },
        updateSettings: async (section, data) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const settings = await api.updateUserSettings(section, data);
                update(state => ({
                    ...settings,
                    loading: false
                }));
                return settings;
            } catch (error) {
                update(state => ({ 
                    ...state, 
                    loading: false, 
                    error: error.message 
                }));
                throw error;
            }
        },
        addTradingRule: async (rule) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const rules = await api.addTradingRule(rule);
                update(state => ({
                    ...state,
                    tradingRules: rules,
                    loading: false
                }));
                return rules;
            } catch (error) {
                update(state => ({ 
                    ...state, 
                    loading: false, 
                    error: error.message 
                }));
                throw error;
            }
        },
        updateTradingRule: async (ruleId, data) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const rules = await api.updateTradingRule(ruleId, data);
                update(state => ({
                    ...state,
                    tradingRules: rules,
                    loading: false
                }));
                return rules;
            } catch (error) {
                update(state => ({ 
                    ...state, 
                    loading: false, 
                    error: error.message 
                }));
                throw error;
            }
        },
        deleteTradingRule: async (ruleId) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const rules = await api.deleteTradingRule(ruleId);
                update(state => ({
                    ...state,
                    tradingRules: rules,
                    loading: false
                }));
                return rules;
            } catch (error) {
                update(state => ({ 
                    ...state, 
                    loading: false, 
                    error: error.message 
                }));
                throw error;
            }
        },
        validateTrade: async (tradeDetails) => {
            try {
                const result = await api.validateTrade(tradeDetails);
                return result.valid;
            } catch (error) {
                console.error('Trade validation failed:', error);
                throw error;
            }
        },
        exportSettings: async () => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const exportData = await api.exportSettings();
                update(state => ({ ...state, loading: false }));
                return exportData;
            } catch (error) {
                update(state => ({ 
                    ...state, 
                    loading: false, 
                    error: error.message 
                }));
                throw error;
            }
        },
        importSettings: async (importData) => {
            try {
                update(state => ({ ...state, loading: true, error: null }));
                const settings = await api.importSettings(importData);
                update(state => ({
                    ...settings,
                    loading: false
                }));
                return settings;
            } catch (error) {
                update(state => ({ 
                    ...state, 
                    loading: false, 
                    error: error.message 
                }));
                throw error;
            }
        },
        clearError: () => {
            update(state => ({ ...state, error: null }));
        }
    };
}

export const userSettingsStore = createUserSettingsStore();
