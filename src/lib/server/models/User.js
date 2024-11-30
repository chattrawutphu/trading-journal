// server/models/User.js
import mongoose from 'mongoose';

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
  name: String,
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  accounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  }]
});

export default mongoose.model('User', userSchema);