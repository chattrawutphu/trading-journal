// server/controllers/userSettingsController.js
import UserSettings from '../models/UserSettings.js';

const handleError = (res, error) => {
    console.error('Settings Error:', error);
    const statusCode = error.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
};

export const getUserSettings = async(req, res) => {
    try {
        let settings = await UserSettings.findOne({ user: req.user._id });

        if (!settings) {
            // Create default settings if none exist
            settings = await UserSettings.create({ user: req.user._id });
        }

        res.json(settings);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const updateUserSettings = async(req, res) => {
    try {
        const { section, data } = req.body;

        let settings = await UserSettings.findOne({ user: req.user._id });
        if (!settings) {
            settings = new UserSettings({ user: req.user._id });
        }

        // Update only the specified section
        switch (section) {
            case 'profile':
                settings.profile = {...settings.profile, ...data };
                break;
            case 'riskManagement':
                settings.riskManagement = {...settings.riskManagement, ...data };
                break;
            case 'tradingRules':
                if (Array.isArray(data)) {
                    settings.tradingRules = data;
                }
                break;
            case 'notifications':
                settings.notifications = {...settings.notifications, ...data };
                break;
            case 'display':
                settings.display = {...settings.display, ...data };
                break;
            case 'tradingHours':
                settings.tradingHours = {...settings.tradingHours, ...data };
                break;
            case 'journalTemplates':
                if (Array.isArray(data)) {
                    settings.journalTemplates = data;
                }
                break;
            case 'customIndicators':
                if (Array.isArray(data)) {
                    settings.customIndicators = data;
                }
                break;
            case 'exportPreferences':
                settings.exportPreferences = {...settings.exportPreferences, ...data };
                break;
            default:
                res.status(400);
                return handleError(res, new Error('Invalid settings section'));
        }

        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const addTradingRule = async(req, res) => {
    try {
        const { rule } = req.body;

        let settings = await UserSettings.findOne({ user: req.user._id });
        if (!settings) {
            settings = new UserSettings({ user: req.user._id });
        }

        settings.tradingRules.push({ rule, enabled: true });
        await settings.save();

        res.json(settings.tradingRules);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const updateTradingRule = async(req, res) => {
    try {
        const { ruleId } = req.params;
        const { rule, enabled } = req.body;

        const settings = await UserSettings.findOne({ user: req.user._id });
        if (!settings) {
            res.status(404);
            return handleError(res, new Error('Settings not found'));
        }

        const ruleIndex = settings.tradingRules.findIndex(r => r._id.toString() === ruleId);
        if (ruleIndex === -1) {
            res.status(404);
            return handleError(res, new Error('Rule not found'));
        }

        settings.tradingRules[ruleIndex] = {...settings.tradingRules[ruleIndex], rule, enabled };
        await settings.save();

        res.json(settings.tradingRules);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const deleteTradingRule = async(req, res) => {
    try {
        const { ruleId } = req.params;

        const settings = await UserSettings.findOne({ user: req.user._id });
        if (!settings) {
            res.status(404);
            throw new Error('Settings not found');
        }

        settings.tradingRules = settings.tradingRules.filter(r => r._id.toString() !== ruleId);
        await settings.save();

        res.json(settings.tradingRules);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const validateTrade = async(req, res) => {
    try {
        const tradeDetails = req.body;

        const settings = await UserSettings.findOne({ user: req.user._id });
        if (!settings) {
            res.status(404);
            return handleError(res, new Error('Settings not found'));
        }

        // Check if trading is allowed at current time
        if (!settings.isTradeAllowed()) {
            res.status(400);
            return handleError(res, new Error('Trading is not allowed at this time'));
        }

        // Validate trade against risk settings
        const violations = settings.validateTrade(tradeDetails);
        if (violations.length > 0) {
            res.status(400);
            return handleError(res, new Error(`Trade validation failed: ${violations.join(', ')}`));
        }

        res.json({ valid: true });
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const exportSettings = async(req, res) => {
    try {
        const settings = await UserSettings.findOne({ user: req.user._id });
        if (!settings) {
            res.status(404);
            throw new Error('Settings not found');
        }

        // Remove sensitive data before export
        const exportData = settings.toObject();
        delete exportData._id;
        delete exportData.user;
        delete exportData.__v;

        res.json(exportData);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const importSettings = async(req, res) => {
    try {
        const importData = req.body;

        let settings = await UserSettings.findOne({ user: req.user._id });
        if (!settings) {
            settings = new UserSettings({ user: req.user._id });
        }

        // Update all importable sections
        Object.keys(importData).forEach(key => {
            if (key !== '_id' && key !== 'user' && key !== '__v') {
                settings[key] = importData[key];
            }
        });

        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};