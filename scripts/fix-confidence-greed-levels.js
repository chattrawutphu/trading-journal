// Script to fix trades with confidence/greed levels less than 1
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import the Trade model
import Trade from '../src/lib/server/models/Trade.js';

async function fixConfidenceGreedLevels() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
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
        
        console.log(`Updating trade ${trade._id}:`, updates);
        
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
    
    console.log(`\nMigration complete:`);
    console.log(`- Total trades found: ${trades.length}`);
    console.log(`- Successfully updated: ${updatedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error in migration script:', error);
    process.exit(1);
  }
}

// Run the migration
fixConfidenceGreedLevels(); 