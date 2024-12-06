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
import MongoStore from 'connect-mongo';  // เพิ่มบรรทัดนี้
import subscriptionRoutes from './routes/subscriptionRoutes.js';

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..', '..');

// Configure dotenv with the correct path
dotenv.config({ path: join(rootDir, '.env') });

// Function to start the server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    const app = express();

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
        ttl: 7 * 24 * 60 * 60 * 2 // Session จะหมดอายุใน 14 วัน
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 * 2, // 14 วัน ในหน่วยมิลลิวินาที
        sameSite: 'lax'  // แก้ไขเป็น 'lax' เพื่อให้ทำงานกับ cross-origin requests
      }
    }));

    // Health check route
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/accounts', accountRoutes);
    app.use('/api/trades', tradeRoutes);
    app.use('/api/trade-options', tradeOptionRoutes);
    app.use('/api/settings', userSettingsRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/subscription', subscriptionRoutes);

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
      
      // Handle JWT errors
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

      // Handle Mongoose validation errors
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: Object.values(err.errors).map(e => e.message).join(', ')
        });
      }

      // Handle Cast errors (invalid ObjectId)
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

    const PORT = process.env.PORT || 5001; // Change the port number here

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      handleServerError(error);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      handleServerError(error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (error) => {
      console.error('Unhandled Rejection:', error);
      handleServerError(error);
    });

    // Handle process termination
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    handleServerError(error);
  }
}

// Function to handle server errors and restart
async function handleServerError(error) {
  console.error('Server encountered an error. Attempting to restart...');
  
  try {
    // Wait for 5 seconds before attempting to restart
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Restarting server...');
    startServer();
  } catch (restartError) {
    console.error('Failed to restart server:', restartError);
    process.exit(1);
  }
}

// Graceful shutdown function
async function gracefulShutdown(server) {
  console.log('Received shutdown signal. Starting graceful shutdown...');
  
  try {
    // Close the HTTP server
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      console.log('HTTP server closed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
