import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getStatus,
  processPayment,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  downloadInvoice
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.use(protect);

router.get('/status', getStatus);
router.post('/process-payment', processPayment);
router.post('/cancel', cancelSubscription);
router.post('/reactivate', reactivateSubscription);
router.get('/invoices', getInvoices);
router.get('/invoices/:id/download', downloadInvoice);

export default router;
