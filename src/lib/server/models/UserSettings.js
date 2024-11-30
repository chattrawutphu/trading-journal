// server/models/UserSettings.js
import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    profile: {
        timezone: String,
        defaultCurrency: { type: String, default: 'USD' }
    },
    riskManagement: {
        maxRiskPerTrade: { type: Number, default: 1 }, // percentage
        maxDailyLoss: { type: Number, default: 3 }, // percentage
        maxPositions: { type: Number, default: 5 },
        defaultStopLoss: { type: Number, default: 2 }, // percentage
        defaultTakeProfit: { type: Number, default: 6 }, // percentage
        enableRiskWarnings: { type: Boolean, default: true }
    },
    tradingRules: [{
        rule: String,
        enabled: { type: Boolean, default: true }
    }],
    notifications: {
        emailAlerts: { type: Boolean, default: true },
        tradeUpdates: { type: Boolean, default: true },
        riskWarnings: { type: Boolean, default: true },
        performanceReports: { type: Boolean, default: true },
        marketNews: { type: Boolean, default: false }
    },
    display: {
        theme: { type: String, default: 'dark' },
        chartType: { type: String, default: 'candlestick' },
        defaultTimeframe: { type: String, default: 'D' }
    },
    tradingHours: {
        enabled: { type: Boolean, default: false },
        startTime: String,
        endTime: String,
        timezone: String,
        tradingDays: [String] // e.g., ['Monday', 'Tuesday', ...]
    },
    journalTemplates: [{
        name: String,
        fields: [{
            name: String,
            type: String, // text, number, boolean, select
            required: Boolean,
            options: [String] // for select type
        }]
    }],
    customIndicators: [{
        name: String,
        formula: String,
        parameters: [{
            name: String,
            defaultValue: mongoose.Schema.Types.Mixed
        }]
    }],
    exportPreferences: {
        defaultFormat: { type: String, default: 'csv' },
        includeImages: { type: Boolean, default: true },
        dateFormat: { type: String, default: 'YYYY-MM-DD' }
    }
}, {
    timestamps: true
});

// Initialize default trading rules
userSettingsSchema.pre('save', function(next) {
    if (this.isNew && !this.tradingRules?.length) {
        this.tradingRules = [
            { rule: 'Wait for confirmation before entering a trade', enabled: true },
            { rule: 'Always use a stop loss', enabled: true },
            { rule: 'Never risk more than 1% per trade', enabled: true },
            { rule: 'No trading during major news events', enabled: true },
            { rule: 'Only trade during main session hours', enabled: true }
        ];
    }
    next();
});

// Method to check if trading is allowed at current time
userSettingsSchema.methods.isTradeAllowed = function() {
    if (!this.tradingHours.enabled) return true;

    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (!this.tradingHours.tradingDays.includes(day)) return false;

    const currentTime = now.toLocaleTimeString('en-US', { 
        timeZone: this.tradingHours.timezone,
        hour12: false 
    });

    return currentTime >= this.tradingHours.startTime && 
           currentTime <= this.tradingHours.endTime;
};

// Method to validate trade against risk settings
userSettingsSchema.methods.validateTrade = function(tradeDetails) {
    const violations = [];

    if (tradeDetails.riskPercentage > this.riskManagement.maxRiskPerTrade) {
        violations.push(`Risk per trade (${tradeDetails.riskPercentage}%) exceeds maximum allowed (${this.riskManagement.maxRiskPerTrade}%)`);
    }

    if (!tradeDetails.stopLoss && this.tradingRules.find(r => r.rule.includes('stop loss') && r.enabled)) {
        violations.push('Stop loss is required by trading rules');
    }

    return violations;
};

export default mongoose.model('UserSettings', userSettingsSchema);
