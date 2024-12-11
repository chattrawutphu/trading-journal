// server/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import tradeOptionRoutes from './routes/tradeOptionRoutes.js';
import userSettingsRoutes from './routes/userSettingsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import MongoStore from 'connect-mongo';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import './schedulers/subscriptionScheduler.js';

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..', '..');

// Configure dotenv with the correct path
dotenv.config({ path: join(rootDir, '.env') });

// Initialize express app
const app = express();

// Connect to MongoDB
let isConnected = false;
const connectToDatabase = async () => {
  if (isConnected) return;
  await connectDB();
  isConnected = true;
};

// Middleware
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 7 * 24 * 60 * 60 * 2 // 14 days
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 * 2, // 14 days in milliseconds
    sameSite: 'lax'
  }
}));

// Health check route
app.get('/health', async (req, res) => {
  await connectToDatabase();
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/auth', async (req, res, next) => {
  await connectToDatabase();
  return authRoutes(req, res, next);
});
app.use('/api/accounts', async (req, res, next) => {
  await connectToDatabase();
  return accountRoutes(req, res, next);
});
app.use('/api/trades', async (req, res, next) => {
  await connectToDatabase();
  return tradeRoutes(req, res, next);
});
app.use('/api/trade-options', async (req, res, next) => {
  await connectToDatabase();
  return tradeOptionRoutes(req, res, next);
});
app.use('/api/settings', async (req, res, next) => {
  await connectToDatabase();
  return userSettingsRoutes(req, res, next);
});
app.use('/api/user', async (req, res, next) => {
  await connectToDatabase();
  return userRoutes(req, res, next);
});
app.use('/api/transactions', async (req, res, next) => {
  await connectToDatabase();
  return transactionRoutes(req, res, next);
});
app.use('/api/subscription', async (req, res, next) => {
  await connectToDatabase();
  return subscriptionRoutes(req, res, next);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: Object.values(err.errors).map(e => e.message).join(', ')
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format'
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Export the app for serverless use
export default app;

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
