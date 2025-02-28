import mongoose from 'mongoose';

const dayTagHistorySchema = new mongoose.Schema({
    tag: {
        type: String,
        required: true
    },
    note: {
        type: String,
        default: '',
        maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    favorite: {
        type: Boolean,
        default: false
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create a compound unique index for user and tag
dayTagHistorySchema.index({ user: 1, tag: 1 }, { unique: true });

// Update the updatedAt timestamp before saving
dayTagHistorySchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.model('DayTagHistory', dayTagHistorySchema); 