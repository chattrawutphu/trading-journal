// server/routes/authRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    verifyToken
} from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/verify-token', verifyToken);

// Protected routes
router.use(protect);
router.route('/profile')
    .get(getProfile)
    .put(updateProfile);

export default router;
