// Script to fix incorrect tag usage counts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import the models
import Trade from '../src/lib/server/models/Trade.js';
import TradeTag from '../src/lib/server/models/TradeTag.js';
import DayConfig from '../src/lib/server/models/DayConfig.js';
import DayTag from '../src/lib/server/models/DayTag.js';

async function fixTagUsageCounts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Fix Trade Tags
    console.log('Fixing Trade Tag usage counts...');
    await fixTradeTags();
    
    // Fix Day Tags
    console.log('\nFixing Day Tag usage counts...');
    await fixDayTags();
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error in tag fix script:', error);
    process.exit(1);
  }
}

async function fixTradeTags() {
  try {
    // Get all trade tags
    const tradeTags = await TradeTag.find({});
    console.log(`Found ${tradeTags.length} trade tags`);
    
    let updatedCount = 0;
    let errorCount = 0;
    let unchangedCount = 0;
    
    // Process each trade tag
    for (const tag of tradeTags) {
      try {
        // Count actual occurrences in trades
        const actualCount = await Trade.countDocuments({ tags: tag.value });
        
        // If count is different, update it
        if (tag.usageCount !== actualCount) {
          console.log(`Updating trade tag "${tag.value}": ${tag.usageCount} → ${actualCount}`);
          
          await TradeTag.findByIdAndUpdate(tag._id, { usageCount: actualCount });
          updatedCount++;
          
          // If actual count is 0, delete the tag
          if (actualCount === 0) {
            console.log(`Deleting unused trade tag "${tag.value}"`);
            await TradeTag.findByIdAndDelete(tag._id);
          }
        } else {
          unchangedCount++;
        }
      } catch (err) {
        console.error(`Error updating trade tag ${tag._id} (${tag.value}):`, err);
        errorCount++;
      }
    }
    
    console.log(`\nTrade Tags fix complete:`);
    console.log(`- Total tags found: ${tradeTags.length}`);
    console.log(`- Updated: ${updatedCount}`);
    console.log(`- Unchanged: ${unchangedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error fixing trade tags:', error);
  }
}

async function fixDayTags() {
  try {
    // Get all day tags
    const dayTags = await DayTag.find({});
    console.log(`Found ${dayTags.length} day tags`);
    
    let updatedCount = 0;
    let errorCount = 0;
    let unchangedCount = 0;
    
    // Process each day tag
    for (const tag of dayTags) {
      try {
        // Count actual occurrences in day configs
        const actualCount = await DayConfig.countDocuments({ tags: tag.value });
        
        // If count is different, update it
        if (tag.usageCount !== actualCount) {
          console.log(`Updating day tag "${tag.value}": ${tag.usageCount} → ${actualCount}`);
          
          await DayTag.findByIdAndUpdate(tag._id, { usageCount: actualCount });
          updatedCount++;
          
          // If actual count is 0, delete the tag
          if (actualCount === 0) {
            console.log(`Deleting unused day tag "${tag.value}"`);
            await DayTag.findByIdAndDelete(tag._id);
          }
        } else {
          unchangedCount++;
        }
      } catch (err) {
        console.error(`Error updating day tag ${tag._id} (${tag.value}):`, err);
        errorCount++;
      }
    }
    
    console.log(`\nDay Tags fix complete:`);
    console.log(`- Total tags found: ${dayTags.length}`);
    console.log(`- Updated: ${updatedCount}`);
    console.log(`- Unchanged: ${unchangedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error fixing day tags:', error);
  }
}

// Run the fix script
fixTagUsageCounts(); 