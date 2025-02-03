// server/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { SUBSCRIPTION_TYPES } from '../../config/subscription.js';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
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
    },
    loginAttempts: {
        count: { type: Number, default: 0 },
        lastAttempt: { type: Date },
        blockedUntil: { type: Date }
    }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
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

// Add methods for login attempts
userSchema.methods.incrementLoginAttempts = async function() {
    const now = new Date();

    // Reset attempts if last attempt was more than 5 minutes ago
    if (this.loginAttempts.lastAttempt &&
        (now - this.loginAttempts.lastAttempt) > 5 * 60 * 1000) {
        this.loginAttempts.count = 0;
        this.loginAttempts.blockedUntil = null;
    }

    this.loginAttempts.count += 1;
    this.loginAttempts.lastAttempt = now;

    // Block for 5 minutes if 5 or more attempts
    if (this.loginAttempts.count >= 5) {
        this.loginAttempts.blockedUntil = new Date(now.getTime() + 5 * 60 * 1000);
    }

    await this.save();
    return this.loginAttempts.count;
};

userSchema.methods.resetLoginAttempts = async function() {
    this.loginAttempts = {
        count: 0,
        lastAttempt: null,
        blockedUntil: null
    };
    await this.save();
};

userSchema.methods.isLoginBlocked = function() {
    if (!this.loginAttempts.blockedUntil) return false;
    return new Date() < this.loginAttempts.blockedUntil;
};

const User = mongoose.model('User', userSchema);
export default User;