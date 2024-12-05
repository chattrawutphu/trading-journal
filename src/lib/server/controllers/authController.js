// server/controllers/authController.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      email,
      password,
      name,
      strategies: [] // Initialize empty strategies array
    });

    if (user) {
      const token = jwt.sign({ id: user._id }, JWT_SECRET, {
        expiresIn: '30d',
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        strategies: user.strategies,
        token,
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      const token = jwt.sign({ id: user._id }, JWT_SECRET, {
        expiresIn: '30d',
      });

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        strategies: user.strategies,
        token,
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    res.status(401);
    throw error;
  }
};

export const logout = async (req, res) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        strategies: user.strategies
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

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      const token = jwt.sign({ id: updatedUser._id }, JWT_SECRET, {
        expiresIn: '30d',
      });

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        strategies: updatedUser.strategies,
        token,
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
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
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
