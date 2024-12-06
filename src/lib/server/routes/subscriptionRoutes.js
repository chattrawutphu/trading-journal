import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getSubscriptionStatus,
  processPayment,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  downloadInvoice,
  handleDepayWebhook,
  createSubscription,       // Already imported
  confirmPayment,           // Added confirmPayment
  createDepayTransaction    // Added createDepayTransaction
} from '../controllers/subscriptionController.js';

const router = express.Router();

// Webhook route should not require authentication
router.post('/webhooks/depay', handleDepayWebhook);

// Don't require authentication for DePay callback
router.post('/confirm-payment', confirmPayment);

// Apply protection middleware to all routes below
router.use(protect);

// Ensure only Depay webhook route is active
// Remove or comment out other webhook routes if any
// router.post('/webhooks/stripe', handleStripeWebhook);
// router.post('/webhooks/ethereum', handleEthereumWebhook);

// Subscription routes
router.get('/status', getSubscriptionStatus);
router.post('/create', createSubscription);
router.post('/cancel', cancelSubscription);
router.post('/reactivate', reactivateSubscription);
router.get('/invoices', getInvoices);
router.get('/invoices/:invoiceId/download', downloadInvoice);
router.post('/process-payment', processPayment);
router.post('/confirm-payment', confirmPayment); // Added confirm-payment route
router.post('/create-depay-transaction', createDepayTransaction); // Added create-depay-transaction route

// Ensure only one export default exists
export default router;
