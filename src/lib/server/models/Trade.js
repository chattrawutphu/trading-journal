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
        required: function() {
            return this.type === 'SYNC';  // กำหนดให้ required เฉพาะ SYNC trades
        }
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
    },
    type: {
        type: String,
        enum: ['MANUAL', 'SYNC'],
        default: 'MANUAL'
    },
    // Rename closeHistory to positionHistory and update validation
    positionHistory: {
        type: Array,
        default: [],
        validate: {
            validator: function(v) {
                // Validate structure if needed
                if (!Array.isArray(v)) return false;
                return v.every(item => 
                    item.date && item.quantity && 
                    item.percentage && item.price && 
                    typeof item.pnl !== 'undefined' &&
                    item.action // Check for action field (INCREASE or DECREASE)
                );
            },
            message: props => 'Invalid positionHistory structure'
        }
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

// เพิ่ม method สำหรับอัพเดทราคาปัจจุบัน
tradeSchema.methods.updateCurrentPrice = function(currentPrice) {
    this.price = currentPrice;
    this.lastPriceUpdate = new Date();
    
    // คำนวณ unrealized PnL สำหรับ open positions
    if (this.status === 'OPEN') {
        const units = this.quantity;
        if (this.side === 'LONG') {
            this.pnl = (currentPrice - this.entryPrice) * units;
        } else {
            this.pnl = (this.entryPrice - currentPrice) * units;
        }
    }
    
    return this.save();
};

// เพิ่ม method สำหรับคำนวณ unrealized PnL
tradeSchema.methods.calculateUnrealizedPnL = function() {
    if (this.status !== 'OPEN' || !this.price) {
        return 0;
    }

    const units = this.quantity;
    if (this.side === 'LONG') {
        return (this.price - this.entryPrice) * units;
    } else {
        return (this.entryPrice - this.price) * units;
    }
};

// ปรับปรุง pre-save hook
tradeSchema.pre('save', function(next) {
    // Generate orderId for manual trades if needed
    if (!this.orderId && this.type === 'MANUAL') {
        this.orderId = generateOrderId();
    }

    // Set amount if not already set
    if (!this.amount) {
        this.amount = this.entryPrice * this.quantity;
    }

    // Ensure confidenceLevel and greedLevel are at least 1
    if (this.confidenceLevel < 1) {
        this.confidenceLevel = 1;
    }
    
    if (this.greedLevel < 1) {
        this.greedLevel = 1;
    }

    next();
});

export default mongoose.model('Trade', tradeSchema);