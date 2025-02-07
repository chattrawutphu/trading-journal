// server/models/Account.js
import mongoose from 'mongoose';
import Trade from './Trade.js';

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
    },
    excludeZeroPnL: {
        type: Boolean,
        default: false
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

// Add method to import trades
accountSchema.methods.importTrades = async function(trades) {
    const tradePromises = trades.map(trade => {
        // Convert Binance trade to our trade format
        const tradeData = {
            account: this._id,
            user: this.user,
            symbol: trade.symbol,
            side: trade.side,
            price: parseFloat(trade.price),
            quantity: parseFloat(trade.qty),
            commission: parseFloat(trade.commission),
            commissionAsset: trade.commissionAsset,
            realizedPnl: parseFloat(trade.realizedPnl || 0),
            time: new Date(trade.time),
            status: 'CLOSED',
            type: this.type,
            orderId: trade.orderId,
            source: 'IMPORT'
        };

        return Trade.create(tradeData);
    });

    await Promise.all(tradePromises);
};

export default mongoose.model('Account', accountSchema);