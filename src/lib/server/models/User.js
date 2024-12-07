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
        status: {
            type: String,
            enum: ['active', 'cancelled', 'expired'],
            default: 'active'
        },
        amount: Number,
        startDate: {
            type: Date,
            default: null
        },
        endDate: {
            type: Date,
            default: null
        },
        cancelAt: Date
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
        transactionHash: String,
        pdfUrl: String
    }],
    strategies: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    uuid: {
        type: String,
        unique: true,
        sparse: true
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

// เพิ่มเมธอดตรวจสอบสถานะการสมัครสมาชิก
userSchema.methods.isSubscriptionActive = function() {
    return this.subscription.status === 'active' && 
           this.subscription.endDate && 
           this.subscription.endDate > new Date();
};

export default mongoose.model('User', userSchema);
