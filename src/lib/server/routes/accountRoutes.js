// server/routes/accountRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  updateBalance,
  deleteAccount,
  getSymbols,
  updateSymbols,
  addSymbol,
  removeSymbol
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

// New symbol management routes
router.route('/:id/symbols')
  .get(getSymbols)
  .put(updateSymbols)
  .post(addSymbol);

router.route('/:id/symbols/:symbol')
  .delete(removeSymbol);

export default router;
