// server/models/SubAccount.js
import mongoose from 'mongoose';
const subAccountSchema = new mongoose.Schema({
    name: { 
      type: String, 
      required: true 
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
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
  
  export default mongoose.model('SubAccount', subAccountSchema);