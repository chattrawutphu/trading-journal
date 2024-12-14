// server/controllers/authController.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { SUBSCRIPTION_TYPES } from '../../config/subscription.js';

export const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Check if email or username already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      throw new Error('Email already exists');
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      res.status(400);
      throw new Error('Username already exists');
    }

    // Password validation
    if (password.length < 8) {
      res.status(400);
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      res.status(400);
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      res.status(400);
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      res.status(400);
      throw new Error('Password must contain at least one number');
    }

    if (!/[!@#$%^&*]/.test(password)) {
      res.status(400);
      throw new Error('Password must contain at least one special character');
    }

    const userData = {
      email,
      password,
      username,
      role: 'user',
      strategies: []
    };

    const user = await User.create(userData);

    if (user) {
      req.session.userId = user._id;
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        strategies: user.strategies,
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email && !username) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either email or username and password'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a password'
      });
    }

    const user = await User.findOne({ $or: [{ email }, { username }] });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email, username, or password'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email, username, or password'
      });
    }

    req.session.userId = user._id;
    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        strategies: user.strategies,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        res.status(500);
        throw new Error('Failed to logout');
      }
      res.json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const getProfile = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'No active session'
      });
    }

    const user = await User.findById(req.session.userId).select('-password');
    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        strategies: user.strategies
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        strategies: updatedUser.strategies,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    res.status(404);
    throw error;
  }
};

export const verifyToken = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        strategies: user.strategies,
        token,
      });
    } else {
      res.status(401);
      throw new Error('Invalid token');
    }
  } catch (error) {
    res.status(401);
    throw error;
  }
};

// User Strategies endpoints
export const getStrategies = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    res.json(user.strategies);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const updateStrategies = async (req, res) => {
  try {
    const { strategies } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    user.strategies = strategies;
    await user.save();
    res.json(user.strategies);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const addStrategy = async (req, res) => {
  try {
    const { strategy } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    if (!user.strategies.includes(strategy)) {
      user.strategies.push(strategy);
      await user.save();
    }
    res.json(user.strategies);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const removeStrategy = async (req, res) => {
  try {
    const { strategy } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    user.strategies = user.strategies.filter(s => s !== strategy);
    await user.save();
    res.json(user.strategies);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.subscription = {
      type: SUBSCRIPTION_TYPES.BASIC,
      status: 'cancelled'
    };

    const updatedUser = await user.save();

    res.json({
      success: true,
      subscription: updatedUser.subscription
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const createSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { type } = req.body;
    if (!SUBSCRIPTION_TYPES[type]) {
      res.status(400);
      throw new Error('Invalid subscription type');
    }

    user.subscription = {
      type,
      status: 'active'
    };

    const updatedUser = await user.save();

    res.json({
      success: true,
      subscription: updatedUser.subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Assuming invoices are stored in user document or fetched from another service
    const invoiceId = req.params.invoiceId;
    const invoice = user.invoices.find(inv => inv.id === invoiceId);

    if (!invoice) {
      res.status(404);
      throw new Error('Invoice not found');
    }

    // Send the invoice file or data
    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Assuming invoices are stored in user document or fetched from another service
    const invoices = user.invoices;

    res.json({
      success: true,
      invoices
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.json({
      success: true,
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const processPayment = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { planType, paymentMethod } = req.body;
    if (!SUBSCRIPTION_TYPES[planType]) {
      res.status(400);
      throw new Error('Invalid subscription type');
    }

    // Process payment logic here (e.g., call to payment gateway)

    // Assuming payment is successful, update subscription
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    user.subscription = {
      type: planType,
      status: 'active',
      startDate: new Date(),
      endDate,
      paymentMethod
    };

    const updatedUser = await user.save();

    res.json({
      success: true,
      subscription: updatedUser.subscription
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const reactivateSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.subscription.status !== 'cancelled') {
      res.status(400);
      throw new Error('Subscription is not cancelled');
    }

    user.subscription.status = 'active';
    user.subscription.cancelAt = null;

    const updatedUser = await user.save();

    res.json({
      success: true,
      subscription: updatedUser.subscription
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
