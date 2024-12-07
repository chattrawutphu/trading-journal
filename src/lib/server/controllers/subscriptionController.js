import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import { 
    SUBSCRIPTION_TYPES, 
    DEPAY_PUBLIC_KEY,
    DEPAY_LINK,  // เพิ่ม DEPAY_LINK ในการ import
    BILLING_PERIODS, 
    PLAN_PRICES 
} from '../../config/subscription.js';
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
        const { planType, billingPeriod, paymentMethod } = req.body;
        
        if (!planType || !billingPeriod) {
            throw new Error('Plan type and billing period are required');
        }

        // Calculate amount based on plan type and billing period
        const amount = PLAN_PRICES[planType][billingPeriod];

        // Calculate end date based on billing period
        const endDate = new Date();
        if (billingPeriod === BILLING_PERIODS.YEARLY) {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
            endDate.setMonth(endDate.getMonth() + 1);
        }

        const invoice = {
            id: `INV-${Date.now()}`,
            date: new Date(),
            amount,
            status: 'paid'
        };

        const subscription = await Subscription.create({
            userId: req.user._id,
            type: planType,
            billingPeriod,
            startDate: new Date(),
            endDate,
            paymentMethod,
            price: {
                amount,
                currency: 'USD'
            },
            invoices: [invoice]
        });

        // Remove user update code
        // Save the subscription
        await subscription.save();

        res.status(201).json({
            success: true,
            subscription,
            invoice
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
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

// Update invoice retrieval to use subscription data
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
                    subscriptionStatus: inv.subscriptionStatus
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
    console.log('DePay Callback Headers:', req.headers);
    console.log('DePay Callback Body:', req.body);

    const {
        status,
        transaction: transaction_hash,
        payload,
        forward_to,
    } = req.body;

    try {
        // ดึง secret_id จาก forward_to URL แทนที่จะใช้จาก secret_id โดยตรง
        const forwardToUrl = new URL(forward_to);
        const userUUID = forwardToUrl.searchParams.get('secret_id');
        const planType = forwardToUrl.searchParams.get('plan');
        const billingPeriod = forwardToUrl.searchParams.get('billing'); // เพิ่มการดึง billing period

        if (!userUUID) {
            console.error('Missing secret_id in forward_to URL');
            return res.status(400).json({ error: 'Missing secret_id' });
        }

        // ค้นหาผู้ใช้โดยใช้ UUID จาก URL parameters
        const user = await User.findOne({ uuid: userUUID });
        
        if (!user) {
            console.error('User not found for UUID:', userUUID);
            return res.status(404).json({ error: 'User not found' });
        }

        if (status !== 'success') {
            console.error('Payment not completed:', status);
            return res.status(400).json({ error: 'Payment not completed' });
        }

        const subscription = await updateSubscription({
            userId: user._id,
            planType,
            billingPeriod, // ส่ง billing period ไปด้วย
            paymentId: payload?.link_id || Date.now().toString(),
            transactionHash: transaction_hash
        });

        // Log สำหรับ debug
        console.log('Payment confirmed for:', {
            userUUID,
            planType,
            userId: user._id,
            transactionHash: transaction_hash
        });

        console.log('Updated subscription:', subscription);

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

// Helper function to determine plan type based on payment link ID
function determinePlanType(paymentId) {
    // Implement your logic to determine the plan type based on the payment link ID
    // For example:
    if (paymentId === '20Fh2IraACfqJyeDQzlizr') {
        return SUBSCRIPTION_TYPES.PRO;
    }
    // Add more conditions as needed
    return SUBSCRIPTION_TYPES.BASIC;
}

// Helper function to update subscription
async function updateSubscription({ userId, planType, billingPeriod, paymentId, transactionHash }) {
    const price = PLAN_PRICES[planType][billingPeriod];
    const startDate = new Date();
    const endDate = new Date();
    
    // กำหนดวันหมดอายุตาม billing period
    if (billingPeriod === BILLING_PERIODS.YEARLY) {
        endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
        endDate.setMonth(endDate.getMonth() + 1);
    }

    // ตรวจสอบว่ามี invoice ที่มี transactionHash นี้อยู่แล้วหรือไม่
    const existingSubscription = await Subscription.findOne({
        userId,
        'invoices.transactionHash': transactionHash
    });

    if (existingSubscription) {
        console.log('Transaction already processed:', transactionHash);
        return existingSubscription;
    }

    // สร้าง invoice ID ที่ไม่ซ้ำกัน
    const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const subscription = await Subscription.findOneAndUpdate(
        { userId },
        {
            $set: {
                type: planType,
                billingPeriod,
                status: 'active',
                startDate,
                endDate,
                'paymentMethod.type': 'depay',
                'paymentMethod.last4': transactionHash.slice(-4),
                'price.amount': price,
            },
            $push: {
                invoices: {
                    id: invoiceId,
                    date: new Date(),
                    amount: price,
                    status: 'paid',
                    transactionHash,
                }
            }
        },
        { 
            new: true,
            upsert: true
        }
    );

    // อัพเดท User model ด้วย โดยเพิ่มการตั้งค่า startDate และ endDate อย่างชัดเจน
    const userUpdateResult = await User.findByIdAndUpdate(userId, {
        $set: {
            'subscription.type': planType,
            'subscription.status': 'active',
            'subscription.amount': price,
            'subscription.startDate': startDate,
            'subscription.endDate': endDate
        },
        $push: { invoices: { id: invoiceId, date: new Date(), amount: price, status: 'paid', transactionHash } }
    }, { new: true });

    console.log('Updated subscription with new invoice:', subscription);
    console.log('User updated:', userUpdateResult);

    return subscription;
}

// แก้ไขฟังก์ชัน getPriceForPlan
function getPriceForPlan(planType) {
    const prices = {
        BASIC: 0,
        PRO: 19.99,      // แก้ราคาให้ตรงกับที่แสดงในหน้าเว็บ
        PRO_PLUS: 49.99  // แก้ราคาให้ตรงกับที่แสดงในหน้าเว็บ
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
    const { planType, billingPeriod } = req.body;

    console.log('Received create-depay-transaction request:', { planType, billingPeriod }); // Debug log

    if (!planType || !billingPeriod || !Object.values(SUBSCRIPTION_TYPES).includes(planType)) {
        console.error('Invalid input:', { planType, billingPeriod }); // Debug log
        return res.status(400).json({ error: 'Invalid or missing plan type or billing period.' });
    }

    try {
        // สร้าง UUID ถ้าผู้ใช้ยังไม่มี
        const userUUID = req.user.uuid || uuidv4();
        
        // บันทึก UUID ลงในผู้ใช้
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { uuid: userUUID } },
            { new: true }
        );

        if (!user) {
            throw new Error('User not found');
        }

        // สร้างลิงก์ DePay พร้อมกับ secret_id และ plan
        const depayLink = `${DEPAY_LINK}?secret_id=${userUUID}&plan=${planType}&billing=${billingPeriod}`;

        // Log เพื่อดูค่า
        console.log('Created DePay link:', {
            depayLink,
            userUUID,
            planType,
            billingPeriod
        });

        res.status(200).json({ depayLink });
    } catch (error) {
        console.error('Error creating Depay transaction:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
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