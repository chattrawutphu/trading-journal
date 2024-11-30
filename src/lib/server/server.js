// server/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import tradeOptionRoutes from './routes/tradeOptionRoutes.js';
import userSettingsRoutes from './routes/userSettingsRoutes.js';

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..', '..');

// Configure dotenv with the correct path
dotenv.config({ path: join(rootDir, '.env') });

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cookieParser()); // Add cookie parser middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'], // Allow both dev and preview servers
  credentials: true // Important for cookies
}));
app.use(express.json({ limit: '1mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true }));

// Add auth token to request if present in cookies
app.use((req, res, next) => {
  if (req.cookies.auth) {
    req.headers.authorization = `Bearer ${req.cookies.auth}`;
  }
  next();
});

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

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;

let server;
try {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Handle server errors
  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  // Handle process termination
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

// Graceful shutdown function
async function gracefulShutdown() {
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
