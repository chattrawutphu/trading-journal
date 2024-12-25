// server/controllers/tradeOptionController.js
import TradeOption from '../models/TradeOption.js';

const handleError = (res, error) => {
    console.error('Trade Option Error:', error);
    const statusCode = error.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
};

export const getOptions = async(req, res) => {
    try {
        const { type } = req.query;
        const query = { user: req.user._id };
        if (type) {
            query.type = type.toUpperCase();
        }

        const options = await TradeOption.find(query)
            .sort({ usageCount: -1, value: 1 });
        res.json(options);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const createOption = async(req, res) => {
    try {
        const { type, value } = req.body;

        // Validate type
        if (!['SYMBOL', 'STRATEGY'].includes(type.toUpperCase())) {
            res.status(400);
            return handleError(res, new Error('Invalid option type'));
        }

        // Check if option already exists for this user
        const existingOption = await TradeOption.findOne({
            user: req.user._id,
            type: type.toUpperCase(),
            value: value.trim()
        });

        if (existingOption) {
            res.status(400);
            return handleError(res, new Error(`${type} already exists`));
        }

        const option = await TradeOption.create({
            type: type.toUpperCase(),
            value: value.trim(),
            user: req.user._id
        });

        res.status(201).json(option);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const updateOption = async(req, res) => {
    try {
        const { optionId } = req.params;
        const { value } = req.body;

        const option = await TradeOption.findOne({
            _id: optionId,
            user: req.user._id
        });

        if (!option) {
            res.status(404);
            return handleError(res, new Error('Option not found'));
        }

        // Check if new value already exists
        const existingOption = await TradeOption.findOne({
            user: req.user._id,
            type: option.type,
            value: value.trim(),
            _id: { $ne: optionId }
        });

        if (existingOption) {
            res.status(400);
            return handleError(res, new Error(`${option.type} already exists`));
        }

        option.value = value.trim();
        await option.save();

        res.json(option);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const deleteOption = async(req, res) => {
    try {
        const { optionId } = req.params;

        const option = await TradeOption.findOne({
            _id: optionId,
            user: req.user._id
        });

        if (!option) {
            res.status(404);
            throw new Error('Option not found');
        }

        await option.deleteOne();
        res.json({ message: 'Option deleted successfully' });
    } catch (error) {
        res.status(400);
        throw error;
    }
};

export const incrementUsage = async(req, res) => {
    try {
        const { optionId } = req.params;

        const option = await TradeOption.findOne({
            _id: optionId,
            user: req.user._id
        });

        if (!option) {
            res.status(404);
            throw new Error('Option not found');
        }

        option.usageCount += 1;
        await option.save();

        res.json(option);
    } catch (error) {
        res.status(400);
        throw error;
    }
};