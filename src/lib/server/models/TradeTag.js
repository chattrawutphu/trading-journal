import mongoose from 'mongoose';

const tradeTagSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: [50, 'Tag value cannot exceed 50 characters']
    },
    usageCount: {
        type: Number,
        default: 0
    }
});

export default mongoose.model('TradeTag', tradeTagSchema); 