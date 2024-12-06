import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import { SUBSCRIPTION_TYPES, DEPAY_PUBLIC_KEY } from '../../config/subscription.js';
import Web3 from 'web3';
import crypto from 'crypto';

// Fix the UUID import to accommodate CommonJS modules
import pkg from 'uuid';
const { v4: uuidv4 } = pkg;

// Initialize Web3 with proper error handling and retry mechanism
function getWeb3Provider() {
    if (!process.env.WEB3_PROVIDER) {
        throw new Error('WEB3_PROVIDER environment variable is not set');
    }

    try {
        const provider = new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER, {
            timeout: 10000, // 10 seconds timeout
            reconnect: {
                auto: true,
                delay: 5000, // 5 seconds delay between retries
                maxAttempts: 5,
                onTimeout: true
            }
        });
        return new Web3(provider);
    } catch (error) {
        console.error('Failed to initialize Web3 provider:', error);
        throw new Error('Failed to initialize payment processor');
    }
}

// Create Web3 instance with lazy initialization
let web3Instance = null;
function getWeb3() {
    if (!web3Instance) {
        web3Instance = getWeb3Provider();
    }
    return web3Instance;
}

// Helper function to verify signature
function verifySignature(payload, signature) {
    const verifier = crypto.createVerify('sha256');
    verifier.update(payload);
    verifier.end();
    return verifier.verify(DEPAY_PUBLIC_KEY, signature, 'base64');
}

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
        
        // Ensure only Depay is used
        if (paymentMethod !== 'depay') {
            throw new Error('Unsupported payment method');
        }

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
            invoices: [invoice]
        });

        // Update user's subscription reference and invoices
        await User.findByIdAndUpdate(req.user._id, {
            $set: {
                'subscription.type': planType,
                'subscription.status': 'active',
                'subscription.amount': amount
            },
            $push: { invoices: invoice }
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
                    subscriptionStatus
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

        const invoiceId = req.params.invoiceId;
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

// ปรับปรุงฟังก์ชันการประมวลผลการชำระเงินด้วย ETH
export const processPayment = async (req, res) => {
    const { user, body } = req;
    const { planType, txHash, paymentMethod } = body;

    if (paymentMethod !== 'depay') {
        return res.status(400).json({ error: 'Unsupported payment method' });
    }

    if (!txHash) {
        return res.status(400).json({ error: 'Transaction hash is required' });
    }

    try {
        // Since Depay uses a fixed link, verify the payment via Depay's callback or webhook
        // Implement verification logic as per Depay's API documentation

        const isValid = await verifyDepayPayment(txHash); // Implement this function accordingly

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid Depay transaction' });
        }

        const price = getPriceForPlan(planType);
        // สร้างหรืออัปเดตการสมัครสมาชิก
        let subscription = await Subscription.findOne({ userId: user.id });

        if (subscription) {
            subscription.type = planType;
            subscription.status = 'active';
            subscription.startDate = new Date();
            subscription.endDate.setMonth(subscription.endDate.getMonth() + 1);
            subscription.paymentMethod = {
                type: 'depay',
                brand: 'Depay',
                last4: txHash.slice(-4).toUpperCase()
            };
            subscription.price.amount = price;
            await subscription.save();
        } else {
            subscription = await Subscription.create({
                userId: user.id,
                type: planType,
                status: 'active',
                startDate: new Date(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                paymentMethod: {
                    type: 'depay',
                    brand: 'Depay',
                    last4: txHash.slice(-4).toUpperCase()
                },
                price: {
                    amount: price,
                    currency: 'USD'
                },
                invoices: [{
                    id: `INV-${Date.now()}`,
                    date: new Date(),
                    amount: price,
                    status: 'paid',
                    pdfUrl: ''
                }]
            });
        }

        res.status(200).json({ success: true, subscription });
    } catch (error) {
        console.error('Error processing Depay payment:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const confirmPayment = async (req, res) => {
    // Log ข้อมูลทั้งหมดที่ได้รับจาก DePay
    console.log('DePay Callback Headers:', req.headers);
    console.log('DePay Callback Body:', req.body);
    
    // DePay จะส่งข้อมูลมาในรูปแบบ:
    // {
    //   payment_id: "unique_payment_id",
    //   status: "completed", 
    //   amount: "0.1",
    //   currency: "ETH",
    //   blockchain: "ethereum",
    //   sender: "0x123...",
    //   recipient: "0x456...",
    //   transaction_hash: "0xabc...",
    //   signature: "...", // ลายเซ็นจาก DePay
    //   metadata: {
    //     planType: "PRO",
    //     userId: "user_id"
    //   }
    // }

    const { 
        payment_id,
        status,
        transaction_hash,
        signature,
        metadata
    } = req.body;

    try {
        // 1. ตรวจสอบว่ามีข้อมูลที่จำเป็นครบถ้วน
        if (!payment_id || !status || !transaction_hash || !signature || !metadata?.planType) {
            console.error('Missing required fields:', { payment_id, status, transaction_hash, signature, metadata });
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 2. ตรวจสอบลายเซ็นจาก DePay
        const payload = JSON.stringify({
            payment_id,
            status,
            transaction_hash
        });

        const isValid = verifySignature(payload, signature);
        if (!isValid) {
            console.error('Invalid signature from DePay');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // 3. ตรวจสอบสถานะการชำระเงิน
        if (status !== 'completed') {
            console.error('Payment not completed:', status);
            return res.status(400).json({ error: 'Payment not completed' });
        }

        // 4. อัพเดทสถานะการสมัครสมาชิก
        const subscription = await updateSubscription({
            userId: metadata.userId,
            planType: metadata.planType,
            paymentId: payment_id,
            transactionHash: transaction_hash
        });

        // 5. ส่งผลลัพธ์กลับ
        res.status(200).json({
            success: true,
            subscription,
            message: 'Payment confirmed successfully'
        });

    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

// Helper function to update subscription
async function updateSubscription({ userId, planType, paymentId, transactionHash }) {
    const price = getPriceForPlan(planType);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await Subscription.findOneAndUpdate(
        { userId },
        {
            $set: {
                type: planType,
                status: 'active',
                startDate: new Date(),
                endDate,
                'paymentMethod.type': 'depay',
                'paymentMethod.last4': transactionHash.slice(-4),
                'price.amount': price,
            },
            $push: {
                invoices: {
                    id: paymentId,
                    date: new Date(),
                    amount: price,
                    status: 'paid',
                }
            }
        },
        { 
            new: true,
            upsert: true
        }
    );

    return subscription;
}

// Helper function
function getPriceForPlan(planType) {
    const prices = {
        BASIC: 0,
        PRO: 0.001,      // Reduced ETH price for testing
        PRO_PLUS: 0.002  // Reduced ETH price for testing
    };
    return prices[planType] || 0;
}

// Load the public key from configuration
const PUBLIC_KEY = DEPAY_PUBLIC_KEY;

export const handleDepayWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-depay-signature'];
        const payload = JSON.stringify(req.body);

        // Verify that the signature exists
        if (!signature) {
            console.error('Missing signature header.');
            return res.status(400).json({ error: 'Missing signature.' });
        }

        // Verify the signature
        const isValid = verifySignature(payload, signature);
        if (!isValid) {
            console.error('Invalid signature.');
            return res.status(400).json({ error: 'Invalid signature.' });
        }

        const event = req.body;
        if (event.type === 'payment.completed') {
            const { userId, planType, txHash } = event.data;

            // Update the user's subscription based on the payment details
            let subscription = await Subscription.findOne({ userId });
            if (subscription) {
                subscription.type = planType;
                subscription.status = 'active';
                subscription.startDate = new Date();
                subscription.endDate.setMonth(subscription.endDate.getMonth() + 1);
                subscription.paymentMethod = {
                    type: 'depay',
                    last4: txHash.slice(-4).toUpperCase()
                };
                subscription.price.amount = getPriceForPlan(planType);
                await subscription.save();
            } else {
                subscription = await Subscription.create({
                    userId,
                    type: planType,
                    status: 'active',
                    startDate: new Date(),
                    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                    paymentMethod: {
                        type: 'depay',
                        brand: 'Depay',
                        last4: txHash.slice(-4).toUpperCase()
                    },
                    price: {
                        amount: getPriceForPlan(planType),
                        currency: 'USD'
                    },
                    invoices: [{
                        id: `INV-${Date.now()}`,
                        date: new Date(),
                        amount: getPriceForPlan(planType),
                        status: 'paid',
                        pdfUrl: ''
                    }]
                });
            }
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ error: 'Unhandled event type' });
        }
    } catch (error) {
        console.error('Error handling Depay webhook:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Create Depay Transaction
export const createDepayTransaction = async (req, res) => {
    const { planType } = req.body;

    if (!planType || !Object.values(SUBSCRIPTION_TYPES).includes(planType)) {
        return res.status(400).json({ error: 'Invalid or missing plan type.' });
    }

    try {
        // Generate a unique transaction hash
        const txHash = uuidv4();

        // Optionally, store the transaction in the database with status 'pending'
        // You can create a Transaction model or include it within the Subscription model
        // For simplicity, we'll assume it's stored within the Subscription model

        // Respond with the txHash to the client
        res.status(200).json({ txHash });
    } catch (error) {
        console.error('Error creating Depay transaction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Verify Depay Payment
export const verifyDepayPayment = async (txHash) => {
    try {
        // Implement verification logic with Depay's API
        // This might involve calling Depay's API endpoint to verify the transaction status

        // Example:
        // const response = await depayApi.verifyTransaction(txHash);
        // return response.isValid;

        // Placeholder implementation:
        // TODO: Replace with actual Depay API verification
        const isValid = true; // Assume it's valid for now
        return isValid;
    } catch (error) {
        console.error('Error verifying Depay payment:', error);
        return false;
    }
};