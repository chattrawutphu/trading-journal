import express from 'express';
import TradeTag from '../models/TradeTag.js';
import Trade from '../models/Trade.js';

const router = express.Router();

// Get all trade tags
router.get('/', async (req, res) => {
    try {
        const tags = await TradeTag.find().sort({ usageCount: -1 });
        res.json(tags);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trade tags' });
    }
});

// Create a new trade tag
router.post('/', async (req, res) => {
    try {
        const { value } = req.body;
        const existingTag = await TradeTag.findOne({ value });
        if (existingTag) {
            return res.status(400).json({ error: 'Tag already exists' });
        }
        const newTag = new TradeTag({ value });
        await newTag.save();
        res.status(201).json(newTag);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create trade tag' });
    }
});

// Delete a trade tag
router.delete('/:id', async (req, res) => {
    try {
        const tag = await TradeTag.findByIdAndDelete(req.params.id);
        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }
        // Remove the tag from all trades
        await Trade.updateMany({ tags: tag.value }, { $pull: { tags: tag.value } });
        res.json({ message: 'Tag deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete trade tag' });
    }
});

// Increment trade tag usage
router.post('/:id/increment', async (req, res) => {
    try {
        const tag = await TradeTag.findByIdAndUpdate(req.params.id, { $inc: { usageCount: 1 } }, { new: true });
        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }
        res.json(tag);
    } catch (error) {
        res.status(500).json({ error: 'Failed to increment trade tag usage' });
    }
});

// Update trade tag usage
router.post('/update-usage', async (req, res) => {
    try {
        const { tagIds } = req.body;
        const updatedTags = await TradeTag.updateMany(
            { _id: { $in: tagIds } },
            { $inc: { usageCount: 1 } },
            { new: true }
        );
        res.json(updatedTags);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update trade tag usage' });
    }
});

// Get trades with a specific tag
router.get('/:tag/trades', async (req, res) => {
    try {
        const { accountId } = req.query;
        const trades = await Trade.find({ account: accountId, tags: req.params.tag });
        res.json(trades);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trades with tag' });
    }
});

export default router; 