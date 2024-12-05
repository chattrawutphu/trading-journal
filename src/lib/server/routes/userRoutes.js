// server/routes/userRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getStrategies,
  updateStrategies,
  addStrategy,
  removeStrategy
} from '../controllers/authController.js';

const router = express.Router();

router.use(protect);

// User Strategies routes
router.route('/strategies')
  .get(getStrategies)
  .put(updateStrategies)
  .post(addStrategy);

router.route('/strategies/:strategy')
  .delete(removeStrategy);

export default router;
