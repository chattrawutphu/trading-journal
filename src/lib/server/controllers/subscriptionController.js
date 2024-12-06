import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import { SUBSCRIPTION_TYPES } from '../../config/subscription.js';

export const getSubscriptionStatus = async (req, res) => {
    try {
        const subscription = await Subscription.findActiveByUserId(req.user._id);
        res.json(subscription || { type: SUBSCRIPTION_TYPES.BASIC });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const createSubscription = async (req, res) => {
    try {
        const { planType, paymentMethod } = req.body;
        
        // Calculate end date (1 month from now)
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        // Calculate amount based on plan type
        const amount = planType === SUBSCRIPTION_TYPES.PRO ? 19.99 : 49.99;

        // Create initial invoice
        const invoice = {
            id: `INV-${Date.now()}`,
            date: new Date(),
            amount,
            status: 'paid'
        };

        const subscription = await Subscription.create({
            userId: req.user._id,
            type: planType,
            startDate: new Date(),
            endDate,
            paymentMethod,
            price: {
                amount,
                currency: 'USD'
            },
            invoices: [invoice]  // Add invoice to subscription
        });

        // Update user's subscription reference and invoices
        await User.findByIdAndUpdate(req.user._id, {
            $set: {
                'subscription.type': planType,
                'subscription.status': 'active',
                'subscription.amount': amount
            },
            $push: { invoices: invoice }  // Add invoice to user's invoices array
        });

        res.status(201).json({
            success: true,
            subscription,
            invoice
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const cancelSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findActiveByUserId(req.user._id);
        if (!subscription) {
            throw new Error('No active subscription found');
        }

        await subscription.cancel();

        // Update user's subscription status
        await User.findByIdAndUpdate(req.user._id, {
            'subscription.status': 'cancelled',
            'subscription.cancelAt': new Date()
        });

        res.json(subscription);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const reactivateSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            userId: req.user._id,
            status: 'cancelled'
        });

        if (!subscription) {
            throw new Error('No cancelled subscription found');
        }

        await subscription.reactivate();

        // Update user's subscription status
        await User.findByIdAndUpdate(req.user._id, {
            'subscription.status': 'active',
            'subscription.cancelAt': null
        });

        res.json(subscription);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getInvoices = async (req, res) => {
    try {
        // Fetch all subscriptions for the user
        const subscriptions = await Subscription.find({ userId: req.user._id });

        // Collect all invoices with standardized subscription status
        let invoices = [];
        subscriptions.forEach(sub => {
            const subscriptionStatus = sub.status === 'active' ? 'Active' :
                sub.status === 'cancelled' ? 'Cancelled' :
                sub.status === 'expired' ? 'Expired' : 'Other';
            sub.invoices.forEach(inv => {
                invoices.push({
                    ...inv.toObject(),
                    subscriptionStatus   // Include standardized subscription status
                });
            });
        });

        // Sort the invoices by date descending
        invoices.sort((a, b) => b.date - a.date);

        res.json({
            success: true,
            invoices
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

export const downloadInvoice = async (req, res) => {
    try {
        const subscription = await Subscription.findActiveByUserId(req.user._id);
        if (!subscription) {
            res.status(404);
            throw new Error('No active subscription found');
        }

        const invoiceId = req.params.id;
        const invoice = subscription.invoices.find(inv => inv.id === invoiceId);

        if (!invoice) {
            res.status(404);
            throw new Error('Invoice not found');
        }

        res.json({
            success: true,
            invoice
        });
    } catch (error) {
        console.error('Download invoice error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

export const processPayment = async (req, res) => {
    const { user, body } = req;
    const { planType, paymentMethod } = body;

    try {
        // Integrate with payment provider (e.g., Stripe, MetaMask)
        // For demonstration, we'll mock the payment success

        // Mock payment success
        const paymentResult = {
            success: true,
            type: paymentMethod.type,
            brand: paymentMethod.brand,
            last4: paymentMethod.last4
        };

        if (!paymentResult.success) {
            return res.status(400).json({ error: 'Payment failed' });
        }

        // Find existing subscription
        let subscription = await Subscription.findOne({ userId: user.id });

        if (subscription) {
            // Update existing subscription
            subscription.type = planType;
            subscription.status = 'active';
            subscription.paymentMethod = {
                type: paymentResult.type,
                brand: paymentResult.brand,
                last4: paymentResult.last4
            };
            subscription.startDate = new Date();
            subscription.endDate = new Date();
            subscription.endDate.setMonth(subscription.endDate.getMonth() + 1); // 1 month duration

            await subscription.save();
        } else {
            // Create new subscription
            subscription = new Subscription({
                userId: user.id,
                type: planType,
                status: 'active',
                paymentMethod: {
                    type: paymentResult.type,
                    brand: paymentResult.brand,
                    last4: paymentResult.last4
                },
                startDate: new Date(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)) // 1 month duration
            });

            await subscription.save();
        }

        return res.status(200).json({ subscription });
    } catch (error) {
        console.error('Error processing payment:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
