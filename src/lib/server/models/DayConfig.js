import mongoose from 'mongoose';

const dayConfigSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    date: {
        type: String,
        required: true
    },
    note: {
        type: String,
        default: '',
        maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    tags: {
        type: [String],
        default: [],
        validate: {
            validator: function(v) {
                return v.length <= 7;
            },
            message: 'Tags cannot exceed 7 items'
        }
    },
    favorite: {
        type: Boolean,
        default: false
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

// Create a compound unique index for account and date
dayConfigSchema.index({ account: 1, date: 1 }, { unique: true });

// Update the updatedAt timestamp before saving
dayConfigSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.model('DayConfig', dayConfigSchema); 