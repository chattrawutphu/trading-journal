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
  origin: 'http://localhost:5173',
  credentials: true
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