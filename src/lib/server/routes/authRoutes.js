import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  verifyToken,
  getSubscriptionStatus,
  createSubscription,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  downloadInvoice,
  processPayment
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/verify-token', verifyToken);

// Remove the following line as the Depay webhook is handled in subscriptionRoutes.js
// router.post('/webhooks/depay', handleDepayWebhook);

router.use(protect);

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

// Subscription routes
router.get('/subscription/status', getSubscriptionStatus);
router.post('/subscription/create', createSubscription);
router.post('/subscription/cancel', cancelSubscription);
router.post('/subscription/reactivate', reactivateSubscription);
router.get('/subscription/invoices', getInvoices);
router.get('/subscription/invoices/:invoiceId/download', downloadInvoice);
router.post('/subscription/process-payment', processPayment);

// ไม่มีการเปลี่ยนแปลงเพิ่มเติมสำหรับ Depay
export default router;
