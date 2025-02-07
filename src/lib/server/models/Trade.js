// server/models/Trade.js
import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    orderId: {
        type: String,
        sparse: true, // Allow null/undefined but ensure uniqueness when exists
        index: true // Index for faster lookups
    },
    symbol: {
        type: String,
        required: true
    },
    entryDate: {
        type: Date,
        required: true
    },
    exitDate: Date,
    side: {
        type: String,
        enum: ['LONG', 'SHORT'],
        required: true
    },
    status: {
        type: String,
        enum: ['OPEN', 'CLOSED'],
        required: true
    },
    entryPrice: {
        type: Number,
        required: true
    },
    exitPrice: Number,
    quantity: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        comment: 'Amount in USD'
    },
    pnl: Number,
    entryReason: String,
    exitReason: String,
    strategy: String,
    emotions: String,
    notes: String,
    url: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v) return true; // Allow empty
                try {
                    new URL(v);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            message: props => `${props.value} is not a valid URL`
        }
    },
    confidenceLevel: {
        type: Number,
        min: 1,
        max: 10,
        required: true
    },
    greedLevel: {
        type: Number,
        min: 1,
        max: 10,
        required: true
    },
    hasStopLoss: {
        type: Boolean,
        default: false
    },
    hasTakeProfit: {
        type: Boolean,
        default: false
    },
    favorite: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false
    },
    tags: {
        type: [String],
        validate: {
            validator: function(v) {
                return v.length <= 7; // Maximum 7 tags
            },
            message: props => 'Tags cannot exceed 7 items'
        }
    },
    excludeZeroPnL: {
        type: Boolean,
        default: false
    }
});

// Method to calculate PnL without saving (อันนี้เก็บไว้ได้เผื่อใช้ในอนาคต)
tradeSchema.methods.calculatePnL = function(exitPrice) {
    const units = this.amount / this.entryPrice;
    if (this.side === 'LONG') {
        return (exitPrice - this.entryPrice) * units;
    } else {
        return (this.entryPrice - exitPrice) * units;
    }
};

// Add generateOrderId function
function generateOrderId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7);
    return `M${timestamp}${randomStr}`.toUpperCase();
}

// Add pre-save hook to generate orderId for manual trades
tradeSchema.pre('save', function(next) {
    // Skip if orderId already exists or if it's from an exchange
    if (this.orderId) {
        return next();
    }

    // Generate orderId for manual trades
    this.orderId = generateOrderId();
    next();
});

export default mongoose.model('Trade', tradeSchema);