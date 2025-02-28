import mongoose from 'mongoose';

const tradeTagHistorySchema = new mongoose.Schema({
    tag: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: [50, 'Tag value cannot exceed 50 characters']
    },
    favorite: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
});

export default mongoose.model('TradeTagHistory', tradeTagHistorySchema); 