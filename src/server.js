import express from 'express';
import cors from 'cors';
import connectDB from './lib/server/config/database.js';
import authRoutes from './lib/server/routes/authRoutes.js';
import subscriptionRoutes from './lib/server/routes/subscriptionRoutes.js';
import dayTagHistoryRoutes from './lib/server/routes/dayTagHistoryRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:4174',
      'https://trading-journal-sepia.vercel.app',
      'https://trading-journal-liiuvb7go-chattrawut-phoolakorns-projects.vercel.app'
    ];
    
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/tag-history', dayTagHistoryRoutes);

app.listen(PORT, () => {
  // console.log(`Server running on port ${PORT}`);
});