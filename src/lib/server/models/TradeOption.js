// server/models/TradeOption.js
import mongoose from 'mongoose';

const tradeOptionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['SYMBOL', 'STRATEGY'],
        required: true
    },
    value: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure unique values per user and type
tradeOptionSchema.index({ user: 1, type: 1, value: 1 }, { unique: true });

export default mongoose.model('TradeOption', tradeOptionSchema);
