// server/controllers/tradeController.js
import Trade from '../models/Trade.js';
import Account from '../models/Account.js';

export const getTrades = async (req, res) => {
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
    throw error;
  }
};

export const createTrade = async (req, res) => {
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
    if (image?.data) {
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
    throw error;
  }
};

export const updateTrade = async (req, res) => {
  try {
    const { id } = req.params; // Changed from tradeId to id to match route parameter
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
    if (image?.data) {
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

    const updatedTrade = await Trade.findByIdAndUpdate(
      id,
      { 
        ...tradeData,
        image: imageData
      },
      { new: true }
    );

    if (!updatedTrade) {
      res.status(404);
      throw new Error('Trade not found');
    }

    res.json(updatedTrade);
  } catch (error) {
    if (error.name === 'CastError') {
      res.status(400);
      throw new Error('Invalid trade ID format');
    }
    throw error;
  }
};

export const deleteTrade = async (req, res) => {
  try {
    const { id } = req.params; // Changed from tradeId to id
    const trade = await Trade.findById(id).populate('account');

    if (!trade) {
      res.status(404);
      throw new Error('Trade not found');
    }

    // Check if user owns the account associated with this trade
    if (trade.account.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this trade');
    }

    await trade.deleteOne();
    res.json({ message: 'Trade deleted successfully' });
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params; // Changed from tradeId to id
    const trade = await Trade.findById(id).populate('account');

    if (!trade) {
      res.status(404);
      throw new Error('Trade not found');
    }

    // Check if user owns the account associated with this trade
    if (trade.account.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to modify this trade');
    }

    trade.favorite = !trade.favorite;
    await trade.save();

    res.json(trade);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const toggleDisabled = async (req, res) => {
  try {
    const { id } = req.params; // Changed from tradeId to id
    const trade = await Trade.findById(id).populate({
      path: 'account',
      populate: { path: 'user' }
    });

    if (!trade) {
      res.status(404);
      throw new Error('Trade not found');
    }

    // Check if user owns the account associated with this trade
    if (trade.account.user._id.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to modify this trade');
    }

    trade.disabled = !trade.disabled;
    const updatedTrade = await trade.save();

    res.json(updatedTrade);
  } catch (error) {
    if (error.name === 'CastError') {
      res.status(400);
      throw new Error('Invalid trade ID format');
    }
    res.status(error.status || 500);
    throw error;
  }
};
