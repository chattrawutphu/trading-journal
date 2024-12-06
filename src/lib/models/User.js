
// server/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { SUBSCRIPTION_TYPES } from '../../config/subscription.js';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    subscription: {
        type: {
            type: String,
            enum: Object.values(SUBSCRIPTION_TYPES),
            default: SUBSCRIPTION_TYPES.BASIC
        },
        startDate: Date,
        endDate: Date,
        status: {
            type: String,
            enum: ['active', 'cancelled', 'expired'],
            default: 'active'
        },
        subscriptionId: String,  // Payment provider subscription ID
        customerId: String,      // Payment provider customer ID
        cancelAt: Date,          // When subscription will be cancelled
        lastPayment: Date,
        nextPayment: Date,
        paymentMethod: {
            type: String,
            brand: String,       // e.g. 'visa', 'mastercard'
            last4: String        // Last 4 digits of card
        }
    },
    strategies: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);