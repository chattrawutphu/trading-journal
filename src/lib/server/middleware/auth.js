// server/middleware/auth.js
import User from '../models/User.js';

export const protect = async(req, res, next) => {
    try {
        if (!req.session.userId) {
            res.status(401).json({ message: 'Not authorized, no session' });
            return;
        }

        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            res.status(401).json({ message: 'Not authorized, user not found' });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};