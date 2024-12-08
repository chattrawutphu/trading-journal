import cron from 'node-cron';
import mongoose from 'mongoose';
import Subscription from '../models/Subscription.js';

// Increase Mongoose timeout settings
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 30000); // 30 seconds

// Get the cron schedule from environment variables or default to every hour
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 * * * *';

// Remove the cron job
// cron.schedule(CRON_SCHEDULE, async () => {
//     try {
//         console.log('Running subscription expiration check...');
//         await Subscription.updateExpiredSubscriptions();
//         console.log('Subscription expiration check completed.');
//     } catch (error) {
//         console.error('Error updating expired subscriptions:', error);
//     }
// });

//เปลี่ยนไปใช้ mongo atlas trigger