// server/controllers/tradeController.js
import Trade from '../models/Trade.js';
import Account from '../models/Account.js';

// Add error handler helper
const handleError = (res, error) => {
    console.error('Error:', error);
    const statusCode = error.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
};

export const getTrades = async(req, res) => {
    try {
        const { accountId } = req.query;
        const account = await Account.findOne({
            _id: accountId,
            user: req.user._id,
        });

        if (!account) {
            res.status(404);
            throw new Error('Account not found');
        }

        const trades = await Trade.find({ account: accountId });
        res.json(trades);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

function getDateRange(period) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;

        case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(startDate);
            endDate.setHours(12, 0, 0, 0);
            break;

        case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            break;

        case 'prevWeek':
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 1);
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 6);
            break;

        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;

        case 'prevMonth':
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            break;

        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;

        case 'prevYear':
            endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            break;

        case 'q1':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 2, 31, 23, 59, 59, 999);
            break;

        case 'q2':
            startDate = new Date(now.getFullYear(), 3, 1);
            endDate = new Date(now.getFullYear(), 5, 30, 23, 59, 59, 999);
            break;

        case 'q3':
            startDate = new Date(now.getFullYear(), 6, 1);
            endDate = new Date(now.getFullYear(), 8, 30, 23, 59, 59, 999);
            break;

        case 'q4':
            startDate = new Date(now.getFullYear(), 9, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;

        case 'total':
            startDate = new Date(0); // Beginning of time
            break;

        default:
            throw new Error('Invalid period');
    }

    return { startDate, endDate };
}

export const getStats = async(req, res) => {
    try {
        const { accountId, period } = req.query;
        const account = await Account.findOne({
            _id: accountId,
            user: req.user._id,
        });

        if (!account) {
            res.status(404);
            throw new Error('Account not found');
        }

        const { startDate, endDate } = getDateRange(period);

        // Get all trades before the start date to calculate starting balance
        const previousTrades = await Trade.find({
            account: accountId,
            status: 'CLOSED',
            exitDate: { $lt: startDate }
        });

        // Calculate starting balance
        const previousPnL = previousTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        const startingBalance = account.balance - previousPnL;

        // Get trades for the period
        const periodTrades = await Trade.find({
            account: accountId,
            status: 'CLOSED',
            exitDate: {
                $gte: startDate,
                $lte: endDate
            }
        });

        const periodPnL = periodTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);

        const stats = {
            pnl: periodPnL,
            trades: periodTrades.length,
            startingBalance,
            balanceChange: startingBalance > 0 ? (periodPnL / startingBalance) * 100 : 0
        };

        res.json(stats);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const createTrade = async(req, res) => {
    try {
        const { account: accountId, image, ...tradeData } = req.body;
        const account = await Account.findOne({
            _id: accountId,
            user: req.user._id,
        });

        if (!account) {
            res.status(404);
            throw new Error('Account not found');
        }

        // Handle image data
        let imageData = null;
        if (image && image.data) {
            const buffer = Buffer.from(image.data, 'base64');
            if (buffer.length > 409600) { // 400KB limit
                res.status(400);
                throw new Error('Image size must not exceed 400KB');
            }
            imageData = {
                data: buffer,
                contentType: image.contentType,
                size: buffer.length
            };
        }

        const trade = await Trade.create({
            ...tradeData,
            account: accountId,
            image: imageData
        });

        res.status(201).json(trade);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const updateTrade = async(req, res) => {
    try {
        const { id } = req.params;
        const { image, ...tradeData } = req.body;

        // First find the trade without populating to check existence
        const trade = await Trade.findById(id);
        if (!trade) {
            res.status(404);
            throw new Error('Trade not found');
        }

        // Then get the account to check ownership
        const account = await Account.findById(trade.account);
        if (!account) {
            res.status(404);
            throw new Error('Account not found');
        }

        // Check if user owns the account associated with this trade
        if (account.user.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this trade');
        }

        // Handle image data
        let imageData = trade.image; // Keep existing image by default
        if (image && image.data) {
            const buffer = Buffer.from(image.data, 'base64');
            if (buffer.length > 409600) { // 400KB limit
                res.status(400);
                throw new Error('Image size must not exceed 400KB');
            }
            imageData = {
                data: buffer,
                contentType: image.contentType,
                size: buffer.length
            };
        } else if (image === null) {
            // If image is explicitly set to null, remove the existing image
            imageData = null;
        }

        // Debug the trade data before updating
        /* console.log(`[updateTrade] Updating trade ${id} with data:`, {
            id,
            hasPositionHistory: !!tradeData.positionHistory,
            positionHistoryLength: tradeData.positionHistory ? tradeData.positionHistory.length : 0,
            positionHistory: tradeData.positionHistory
        });*/
        
        // Attempt to update the trade
        const updatedTrade = await Trade.findByIdAndUpdate(
            id, 
            {
                ...tradeData,
                image: imageData
            }, 
            { new: true }
        );
        
        if (!updatedTrade) {
            console.error(`[updateTrade] Trade not found with id ${id}`);
            return res.status(404).json({ message: 'Trade not found' });
        }
        
        // Debug the updated trade
        /* console.log(`[updateTrade] Trade updated - result:`, {
            updatedTradeId: updatedTrade._id,
            hasPositionHistory: !!updatedTrade.positionHistory,
            positionHistoryLength: updatedTrade.positionHistory ? updatedTrade.positionHistory.length : 0
        });*/
        
        return res.status(200).json(updatedTrade);
    } catch (error) {
        if (error.name === 'CastError') {
            res.status(400);
            throw new Error('Invalid trade ID format');
        }
        res.status(500);
        handleError(res, error);
    }
};

export const deleteTrade = async(req, res) => {
    try {
        const { id } = req.params;
        const trade = await Trade.findById(id).populate('account');

        if (!trade) {
            res.status(404);
            return handleError(res, new Error('Trade not found'));
        }

        // Check if user owns the account associated with this trade
        if (trade.account.user.toString() !== req.user._id.toString()) {
            res.status(403);
            return handleError(res, new Error('Not authorized to delete this trade'));
        }

        await trade.deleteOne();
        res.json({ message: 'Trade deleted successfully' });
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const toggleFavorite = async(req, res) => {
    try {
        const { id } = req.params;
        const trade = await Trade.findById(id).populate('account');

        if (!trade) {
            res.status(404);
            return handleError(res, new Error('Trade not found'));
        }

        // Check if user owns the account associated with this trade
        if (trade.account.user.toString() !== req.user._id.toString()) {
            res.status(403);
            return handleError(res, new Error('Not authorized to modify this trade'));
        }

        trade.favorite = !trade.favorite;
        await trade.save();

        res.json(trade);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const toggleDisabled = async(req, res) => {
    try {
        const { id } = req.params;
        const trade = await Trade.findById(id).populate({
            path: 'account',
            populate: { path: 'user' }
        });

        if (!trade) {
            res.status(404);
            return handleError(res, new Error('Trade not found'));
        }

        // Check if user owns the account associated with this trade
        if (trade.account.user._id.toString() !== req.user._id.toString()) {
            res.status(403);
            return handleError(res, new Error('Not authorized to modify this trade'));
        }

        trade.disabled = !trade.disabled;
        const updatedTrade = await trade.save();

        res.json(updatedTrade);
    } catch (error) {
        if (error.name === 'CastError') {
            res.status(400);
            return handleError(res, new Error('Invalid trade ID format'));
        }
        res.status(error.status || 500);
        handleError(res, error);
    }
};