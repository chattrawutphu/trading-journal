// server/routes/accountRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  updateBalance,
  deleteAccount
} from '../controllers/accountController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAccounts)
  .post(createAccount);

router.route('/:id')
  .get(getAccount)
  .put(updateAccount)
  .delete(deleteAccount);

router.route('/:id/balance')
  .put(updateBalance);

export default router;
