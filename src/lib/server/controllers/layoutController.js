import Layout from '../models/Layout.js';

export const getLayouts = async(req, res) => {
    try {
        const layout = await Layout.findOne({ user: req.user._id });
        res.json(layout ? layout.layouts : []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const saveLayouts = async(req, res) => {
    try {
        const { layouts } = req.body;

        await Layout.findOneAndUpdate({ user: req.user._id }, {
            user: req.user._id,
            layouts,
            updatedAt: new Date()
        }, { upsert: true, new: true });

        res.json({ message: 'Layouts saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};