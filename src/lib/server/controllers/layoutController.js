import Layout from '../models/Layout.js';

export const getLayouts = async(req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const layout = await Layout.findOne({ account: req.user._id });
        res.json(layout ? layout.layouts : []);
    } catch (error) {
        console.error('Error getting layouts:', error);
        res.status(500).json({ error: error.message });
    }
};

export const saveLayouts = async(req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { layouts } = req.body;
        
        if (!Array.isArray(layouts)) {
            return res.status(400).json({ error: 'Invalid layouts format' });
        }

        const result = await Layout.findOneAndUpdate(
            { account: req.user._id },
            {
                account: req.user._id,
                layouts,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ 
            message: 'Layouts saved successfully',
            layouts: result.layouts 
        });
    } catch (error) {
        console.error('Error saving layouts:', error);
        res.status(500).json({ error: error.message });
    }
};