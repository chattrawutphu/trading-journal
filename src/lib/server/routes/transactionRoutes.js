import express from 'express';
import { 
  createTransaction, 
  getTransactions, 
  updateTransaction, 
  deleteTransaction 
} from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.use(protect);

router.route('/')
  .post(createTransaction);

router.route('/:accountId')
  .get(getTransactions);

router.route('/:transactionId')
  .put(updateTransaction)
  .delete(deleteTransaction);

export default router;
