import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: () => new Date(), // Store date in UTC
    required: true
  },
  note: {
    type: String,
    default: ''
  }
});

export default mongoose.model('Transaction', transactionSchema);
