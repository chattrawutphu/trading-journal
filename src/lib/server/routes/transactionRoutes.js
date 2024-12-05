import express from 'express';
import { createTransaction, getTransactions } from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.use(protect);

router.route('/')
  .post(createTransaction);

router.route('/:accountId')
  .get(getTransactions);

export default router;
