// server/middleware/auth.js
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            res.status(401);
            throw new Error('Not authorized, no session');
        }

        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            res.status(401);
            throw new Error('Not authorized, user not found');
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};
