// server/routes/authRoutes.js
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

router.use(protect);

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

// Subscription routes
router.get('/subscription/status', protect, getSubscriptionStatus);
router.post('/subscription/create', protect, createSubscription);
router.post('/subscription/cancel', protect, cancelSubscription);
router.post('/subscription/reactivate', protect, reactivateSubscription);
router.get('/subscription/invoices', protect, getInvoices);
router.get('/subscription/invoices/:invoiceId/download', protect, downloadInvoice);
router.post('/subscription/process-payment', protect, processPayment);

export default router;
