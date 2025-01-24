// server/routes/userRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    getStrategies,
    updateStrategies,
    addStrategy,
    removeStrategy
} from '../controllers/authController.js';
import { getLayouts, saveLayouts } from '../controllers/layoutController.js';

const router = express.Router();

router.use(protect);

// User Strategies routes
router.route('/strategies')
    .get(getStrategies)
    .put(updateStrategies)
    .post(addStrategy);

router.route('/strategies/:strategy')
    .delete(removeStrategy);

router.get('/layouts', getLayouts);
router.put('/layouts', saveLayouts);

export default router;