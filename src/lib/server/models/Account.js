// server/models/Account.js
import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    symbols: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['MANUAL', 'BINANCE_FUTURES', 'BYBIT', 'OKEX', 'MT4', 'MT5'],
        default: 'MANUAL'
    },
    apiKey: {
        type: String,
        required: function() {
            return ['BINANCE_FUTURES', 'BYBIT', 'OKEX'].includes(this.type);
        }
    },
    secretKey: {
        type: String,
        required: function() {
            return ['BINANCE_FUTURES', 'BYBIT', 'OKEX'].includes(this.type);
        }
    }
});

// Add encryption for API credentials
accountSchema.pre('save', async function(next) {
    if (this.type === 'BINANCE_FUTURES') {
        if (this.isModified('apiKey')) {
            // Encrypt API key before saving
            // Implementation depends on your encryption method
        }
        if (this.isModified('secretKey')) {
            // Encrypt Secret key before saving
        }
    }
    next();
});

export default mongoose.model('Account', accountSchema);