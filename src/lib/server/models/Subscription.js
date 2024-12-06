import mongoose from 'mongoose';
import { SUBSCRIPTION_TYPES } from '../../config/subscription.js';

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
            enum: ['stripe', 'paypal', 'metamask'],
            required: true
        },
        brand: String,         // e.g. 'visa', 'mastercard', 'ethereum'
        last4: String          // Last 4 digits/characters
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
            enum: ['paid', 'pending', 'failed']
        },
        pdfUrl: String
    }]
}, {
    timestamps: true
});

// Index for faster queries
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 }, { expireAfterSeconds: 0 });

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

// Statics
subscriptionSchema.statics.findActiveByUserId = function(userId) {
    return this.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() }
    });
};

export default mongoose.model('Subscription', subscriptionSchema);
