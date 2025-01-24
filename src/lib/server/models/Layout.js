import mongoose from 'mongoose';

const LayoutSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    layouts: [{
        name: {
            type: String,
            required: true
        },
        widgets: [{
            id: String,
            config: Object,
            props: Object
        }]
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Layout', LayoutSchema);