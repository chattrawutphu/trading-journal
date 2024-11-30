// server/routes/userSettingsRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    getUserSettings,
    updateUserSettings,
    addTradingRule,
    updateTradingRule,
    deleteTradingRule,
    validateTrade,
    exportSettings,
    importSettings
} from '../controllers/userSettingsController.js';

const router = express.Router();

router.use(protect);

// Main settings routes
router.route('/')
    .get(getUserSettings)
    .put(updateUserSettings);

// Trading rules routes
router.route('/rules')
    .post(addTradingRule);

router.route('/rules/:ruleId')
    .put(updateTradingRule)
    .delete(deleteTradingRule);

// Trade validation
router.post('/validate-trade', validateTrade);

// Settings import/export
router.get('/export', exportSettings);
router.post('/import', importSettings);

export default router;
