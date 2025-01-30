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
import mongoose from 'mongoose';

// Get the directory path for ES modules
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..', '..');

// Configure dotenv with the correct path
dotenv.config({ path: join(rootDir, '.env') });

// Initialize express app
const app = express();

// Connect to MongoDB
let isConnected = false;
const connectToDatabase = async() => {
    if (isConnected) return;
    await connectDB();
    isConnected = true;
};

// Middleware
app.use(cookieParser());

// CORS middleware with dynamic origin handling
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost:5173', // Development
            'http://localhost:4173', // Preview default
            'http://localhost:4174', // Preview alternative
            process.env.CORS_ORIGIN // From env
        ].filter(Boolean); // Remove falsy values

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
        client: mongoose.connection.getClient(),
        ttl: 14 * 24 * 60 * 60, // 14 days
        autoRemove: 'native',
        touchAfter: 24 * 3600 // time period in seconds
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
        sameSite: 'lax'
    }
}));

// Health check route
app.get('/health', async(req, res) => {
    await connectToDatabase();
    res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/auth', async(req, res, next) => {
    await connectToDatabase();
    return authRoutes(req, res, next);
});
app.use('/api/accounts', accountRoutes);
app.use('/api/trades', async(req, res, next) => {
    await connectToDatabase();
    return tradeRoutes(req, res, next);
});
app.use('/api/trade-options', async(req, res, next) => {
    await connectToDatabase();
    return tradeOptionRoutes(req, res, next);
});
app.use('/api/settings', async(req, res, next) => {
    await connectToDatabase();
    return userSettingsRoutes(req, res, next);
});
app.use('/api/user', async(req, res, next) => {
    await connectToDatabase();
    return userRoutes(req, res, next);
});
app.use('/api/transactions', async(req, res, next) => {
    await connectToDatabase();
    return transactionRoutes(req, res, next);
});
app.use('/api/subscription', async(req, res, next) => {
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

// Initialize database connection before starting server
const startServer = async() => {
    try {
        await connectToDatabase();
        const PORT = process.env.PORT || 5001; // Change to a different port
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== 'production') {
    startServer();
}

// Export the app for serverless use
export default app;