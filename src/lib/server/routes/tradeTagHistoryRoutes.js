import express from 'express';
import TradeTagHistory from '../models/TradeTagHistory.js';

const router = express.Router();

// Get trade tag history
router.get('/:tag', async (req, res) => {
    try {
        const history = await TradeTagHistory.findOne({ tag: req.params.tag });
        if (!history) {
            return res.status(404).json({ error: 'Trade tag history not found' });
        }
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trade tag history' });
    }
});

// Update trade tag history
router.put('/:tag', async (req, res) => {
    try {
        const history = await TradeTagHistory.findOneAndUpdate(
            { tag: req.params.tag },
            req.body,
            { new: true, upsert: true }
        );
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update trade tag history' });
    }
});

export default router; 