// server/models/Trade.js
import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
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
    // New fields
    image: {
      data: Buffer,
      contentType: String,
      size: {
        type: Number,
        max: 409600, // 400KB in bytes
        validate: {
          validator: function(size) {
            return !this.image || !this.image.data || size <= 409600;
          },
          message: 'Image size must not exceed 400KB'
        }
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
    }
  });

// Auto-calculate PnL before saving
tradeSchema.pre('save', function(next) {
  if (this.status === 'CLOSED' && this.exitPrice) {
    if (this.side === 'LONG') {
      // For long positions: (exitPrice - entryPrice) * quantity
      this.pnl = (this.exitPrice - this.entryPrice) * this.amount;
    } else {
      // For short positions: (entryPrice - exitPrice) * quantity
      this.pnl = (this.entryPrice - this.exitPrice) * this.amount;
    }
  }
  next();
});

// Method to calculate PnL without saving
tradeSchema.methods.calculatePnL = function(exitPrice) {
  if (this.side === 'LONG') {
    return (exitPrice - this.entryPrice) * this.amount;
  } else {
    return (this.entryPrice - exitPrice) * this.amount;
  }
};
  
export default mongoose.model('Trade', tradeSchema);
