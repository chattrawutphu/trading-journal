// server/routes/tradeRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getTrades,
  createTrade,
  updateTrade,
  deleteTrade,
  toggleFavorite,
  toggleDisabled,
  getStats,
} from '../controllers/tradeController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTrades)
  .post(createTrade);

router.get('/stats', getStats);

router.route('/:id')
  .put(updateTrade)
  .delete(deleteTrade);

router.post('/:id/favorite', toggleFavorite);
router.post('/:id/disable', toggleDisabled);

export default router;
