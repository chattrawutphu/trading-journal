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
        const subscription = await Subscription.findActiveByUserId(req.user._id);
        if (!subscription) {
            return res.json({ invoices: [] });
        }

        res.json({
            success: true,
            invoices: subscription.invoices || []
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
    try {
        const { planType, paymentMethod } = req.body;
        if (!Object.values(SUBSCRIPTION_TYPES).includes(planType)) {
            res.status(400);
            throw new Error('Invalid subscription type');
        }

        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const amount = planType === SUBSCRIPTION_TYPES.PRO ? 19.99 : 49.99;

        // Create invoice with more details
        const invoice = {
            id: `INV-${Date.now()}`,
            date: new Date(),
            amount,
            status: 'paid',
            pdfUrl: `invoice-${Date.now()}.pdf`  // Add dummy PDF URL
        };

        // Create or update subscription
        let subscription = await Subscription.findOne({ userId: req.user._id, status: 'active' });
        
        if (subscription) {
            // Update existing subscription
            subscription = await Subscription.findByIdAndUpdate(
                subscription._id,
                {
                    type: planType,
                    endDate,
                    price: {
                        amount,
                        currency: 'USD'
                    },
                    $push: { invoices: invoice }
                },
                { new: true }
            );
        } else {
            // Create new subscription
            subscription = await Subscription.create({
                userId: req.user._id,
                type: planType,
                startDate: new Date(),
                endDate,
                paymentMethod,
                price: {
                    amount,
                    currency: 'USD'
                },
                invoices: [invoice]
            });
        }

        // Update user's subscription and invoices
        await User.findByIdAndUpdate(req.user._id, {
            $set: {
                'subscription.type': planType,
                'subscription.status': 'active',
                'subscription.amount': amount
            },
            $push: { invoices: invoice }
        });

        res.json({
            success: true,
            subscription,
            invoice
        });
    } catch (error) {
        console.error('Process payment error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};
