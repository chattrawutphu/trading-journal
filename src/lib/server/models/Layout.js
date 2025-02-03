import mongoose from 'mongoose';

const LayoutSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
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