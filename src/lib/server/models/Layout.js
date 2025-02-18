import mongoose from 'mongoose';

const LayoutSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true
    },
    layouts: [{
        name: {
            type: String,
            required: true
        },
        widgets: [{
            id: String,
            config: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            },
            props: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            }
        }]
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// เพิ่ม index เพื่อเพิ่มประสิทธิภาพการค้นหา
LayoutSchema.index({ account: 1 });

// ถ้ายังไม่มี model ให้สร้างใหม่
const Layout = mongoose.models.Layout || mongoose.model('Layout', LayoutSchema);

export default Layout;