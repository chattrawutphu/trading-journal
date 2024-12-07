import mongoose from 'mongoose';
import { SUBSCRIPTION_TYPES, BILLING_PERIODS } from '../../config/subscription.js';

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: Object.values(SUBSCRIPTION_TYPES),
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'expired'],
        default: 'active'
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    cancelAt: Date,
    subscriptionId: String,    // Payment provider subscription ID
    customerId: String,        // Payment provider customer ID
    lastPayment: Date,
    nextPayment: Date,
    paymentMethod: {
        type: {
            type: String,
            enum: ['depay'], // Only Depay is used
            required: true
        },
        brand: String,         // e.g., 'Depay'
        last4: String          // Last 4 characters of the transaction hash or identifier
    },
    price: {
        amount: Number,
        currency: {
            type: String,
            default: 'USD'
        }
    },
    invoices: [{
        id: String,
        date: Date,
        amount: Number,
        status: {
            type: String,
            enum: ['paid', 'pending', 'failed'],
            default: 'paid'
        },
        transactionHash: String, // เพิ่มฟิลด์ transactionHash
        pdfUrl: String,
        subscriptionStatus: {
            type: String,
            enum: ['active', 'cancelled', 'expired'],
            default: 'active'
        }
    }],
    billingPeriod: {
        type: String,
        enum: Object.values(BILLING_PERIODS),
        required: true,
        default: BILLING_PERIODS.MONTHLY
    }
}, {
    timestamps: true
});

// Index for faster queries
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 }, { expireAfterSeconds: 0 });
subscriptionSchema.index({ 'invoices.transactionHash': 1 });

// Methods
subscriptionSchema.methods.isActive = function() {
    return this.status === 'active' && this.endDate > new Date();
};

subscriptionSchema.methods.isExpired = function() {
    return this.endDate <= new Date();
};

subscriptionSchema.methods.cancel = function() {
    this.status = 'cancelled';
    this.cancelAt = new Date();
    return this.save();
};

subscriptionSchema.methods.reactivate = function() {
    if (this.status === 'cancelled') {
        this.status = 'active';
        this.cancelAt = null;
        return this.save();
    }
    throw new Error('Can only reactivate cancelled subscriptions');
};

subscriptionSchema.methods.updateSubscriptionStatus = function() {
    if (this.endDate <= new Date()) {
        this.status = 'expired';
    }
    // Update subscriptionStatus in invoices
    this.invoices.forEach(invoice => {
        invoice.subscriptionStatus = this.status;
    });
};

// Pre-save hook to update statuses
subscriptionSchema.pre('save', function(next) {
    this.updateSubscriptionStatus();
    next();
});

// Statics
subscriptionSchema.statics.findActiveByUserId = function(userId) {
    return this.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() }
    });
};

subscriptionSchema.statics.updateExpiredSubscriptions = async function() {
    const now = new Date();
    console.log('Updating expired subscriptions...');
    const result = await this.updateMany(
        { status: 'active', endDate: { $lte: now } },
        { $set: { status: 'expired' } }
    );
    console.log(`Expired subscriptions updated: ${result.nModified}`);
};

export default mongoose.model('Subscription', subscriptionSchema);
