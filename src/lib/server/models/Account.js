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
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  });
  
  export default mongoose.model('Account', accountSchema);
