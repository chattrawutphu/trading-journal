
import cron from 'node-cron';
import Subscription from '../models/Subscription.js';

// Schedule the task to run every minute
cron.schedule('* * * * *', async () => {
    try {
        await Subscription.updateExpiredSubscriptions();
    } catch (error) {
        console.error('Error updating expired subscriptions:', error);
    }
});