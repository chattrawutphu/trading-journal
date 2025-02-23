import mongoose from 'mongoose';

const dayTagSchema = new mongoose.Schema({
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

// Ensure unique values per user
dayTagSchema.index({ user: 1, value: 1 }, { unique: true });

export default mongoose.model('DayTag', dayTagSchema); 