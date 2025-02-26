// Import models
import Account from '../models/Account.js';
import User from '../models/User.js';
import Trade from '../models/Trade.js';
import Transaction from '../models/Transaction.js';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';

// Admin routes
export default function adminRoutes(app) {
  // Admin-only routes - require both auth and admin role
  app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userCount = await User.countDocuments();
      const accountCount = await Account.countDocuments();
      const tradeCount = await Trade.countDocuments();
      const transactionCount = await Transaction.countDocuments();

      res.json({
        users: userCount,
        accounts: accountCount,
        trades: tradeCount,
        transactions: transactionCount
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Add migration route for closeHistory to positionHistory
  app.post('/api/admin/migrate-position-history', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      console.log('Starting migration of closeHistory to positionHistory');
      
      // Find all trades with closeHistory but no positionHistory
      const trades = await Trade.find({
        closeHistory: { $exists: true, $ne: [] },
        positionHistory: { $exists: false }
      });
      
      console.log(`Found ${trades.length} trades to migrate`);
      
      let migratedCount = 0;
      let errorCount = 0;
      
      // Process each trade
      for (const trade of trades) {
        try {
          // Convert closeHistory to positionHistory
          const positionHistory = trade.closeHistory.map(close => ({
            ...close,
            action: 'DECREASE' // All closeHistory entries are decreases
          }));
          
          // Update the trade
          await Trade.findByIdAndUpdate(trade._id, {
            positionHistory,
            // Keep closeHistory for backward compatibility
          });
          
          migratedCount++;
        } catch (err) {
          console.error(`Error migrating trade ${trade._id}:`, err);
          errorCount++;
        }
      }
      
      res.json({
        success: true,
        total: trades.length,
        migrated: migratedCount,
        errors: errorCount
      });
    } catch (error) {
      console.error('Error in position history migration:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error during migration',
        error: error.message 
      });
    }
  });

  // Add migration route to fix confidence and greed levels
  app.post('/api/admin/fix-confidence-greed-levels', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      console.log('Starting migration to fix confidence and greed levels');
      
      // Find all trades with invalid confidence or greed levels
      const trades = await Trade.find({
        $or: [
          { confidenceLevel: { $lt: 1 } },
          { greedLevel: { $lt: 1 } }
        ]
      });
      
      console.log(`Found ${trades.length} trades with invalid confidence/greed levels`);
      
      let updatedCount = 0;
      let errorCount = 0;
      
      // Process each trade
      for (const trade of trades) {
        try {
          // Set minimum values to 1
          const updates = {};
          if (trade.confidenceLevel < 1) updates.confidenceLevel = 1;
          if (trade.greedLevel < 1) updates.greedLevel = 1;
          
          // Only update if needed
          if (Object.keys(updates).length > 0) {
            await Trade.findByIdAndUpdate(trade._id, updates);
            updatedCount++;
          }
        } catch (err) {
          console.error(`Error updating trade ${trade._id}:`, err);
          errorCount++;
        }
      }
      
      res.json({
        success: true,
        total: trades.length,
        updated: updatedCount,
        errors: errorCount
      });
    } catch (error) {
      console.error('Error fixing confidence/greed levels:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error during migration',
        error: error.message 
      });
    }
  });
} 