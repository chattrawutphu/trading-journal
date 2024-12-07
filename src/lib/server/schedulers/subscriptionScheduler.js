import cron from 'node-cron';
import mongoose from 'mongoose';
import Subscription from '../models/Subscription.js';

// Increase Mongoose timeout settings
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 30000); // 30 seconds

// Get the cron schedule from environment variables or default to every hour
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 * * * *';

// Schedule the task to run based on the configured schedule
cron.schedule(CRON_SCHEDULE, async () => {
    try {
        console.log('Running subscription expiration check...');
        await Subscription.updateExpiredSubscriptions();
        console.log('Subscription expiration check completed.');
    } catch (error) {
        console.error('Error updating expired subscriptions:', error);
    }
});