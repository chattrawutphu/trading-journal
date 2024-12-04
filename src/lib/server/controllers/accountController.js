// server/controllers/accountController.js
import Account from '../models/Account.js';
import Trade from '../models/Trade.js';

export const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user._id });
    res.json(accounts);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const getAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    // Get all closed trades for this account
    const trades = await Trade.find({
      account: id,
      status: 'CLOSED'
    });

    // Calculate total PnL
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);

    // Add actual balance to the response
    const accountData = account.toObject();
    accountData.actualBalance = account.balance + totalPnL;

    res.json(accountData);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const createAccount = async (req, res) => {
  try {
    const account = await Account.create({
      ...req.body,
      user: req.user._id,
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    const updatedAccount = await Account.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(updatedAccount);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const updateBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { balance } = req.body;

    const account = await Account.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    account.balance = balance;
    const updatedAccount = await account.save();
    res.json(updatedAccount);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    await account.deleteOne();
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(400);
    throw error;
  }
};
