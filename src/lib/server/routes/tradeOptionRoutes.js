// server/routes/tradeOptionRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getOptions,
  createOption,
  updateOption,
  deleteOption,
  incrementUsage
} from '../controllers/tradeOptionController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getOptions)
  .post(createOption);

router.route('/:optionId')
  .put(updateOption)
  .delete(deleteOption);

router.post('/:optionId/increment', incrementUsage);

export default router;
