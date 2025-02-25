import DayTagHistory from '../models/DayTagHistory.js';

const handleError = (res, error) => {
    console.error('Day Tag History Error:', error);
    const statusCode = error.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        error: error.message || 'Internal server error'
    });
};

export const getTagHistory = async(req, res) => {
    try {
        const { tag } = req.params;
        const tagHistory = await DayTagHistory.findOne({ 
            user: req.user._id,
            tag
        });
        res.json(tagHistory || { tag, note: '', favorite: false });
    } catch (error) {
        handleError(res, error);
    }
};

export const updateTagHistory = async(req, res) => {
    try {
        const { tag } = req.params;
        const { note, favorite } = req.body;

        const tagHistory = await DayTagHistory.findOneAndUpdate(
            { user: req.user._id, tag },
            { 
                $set: { 
                    note: note || '',
                    favorite: favorite || false,
                    user: req.user._id,
                    tag
                }
            },
            { 
                new: true,
                upsert: true
            }
        );

        res.json(tagHistory);
    } catch (error) {
        handleError(res, error);
    }
};

export const deleteTagHistory = async(req, res) => {
    try {
        const { tag } = req.params;
        await DayTagHistory.findOneAndDelete({
            user: req.user._id,
            tag
        });
        res.json({ success: true });
    } catch (error) {
        handleError(res, error);
    }
}; 