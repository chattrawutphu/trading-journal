// server/routes/accountRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  updateBalance,
} from '../controllers/accountController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAccounts)
  .post(createAccount);

router.route('/:accountId')
  .put(updateAccount)
  .delete(deleteAccount);

router.route('/:accountId/balance')
  .put(updateBalance);

export default router;
