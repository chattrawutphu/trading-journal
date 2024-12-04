// server/controllers/accountController.js
import Account from '../models/Account.js';

export const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user._id });
    res.json(accounts);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const createAccount = async (req, res) => {
  try {
    const { name, balance } = req.body;

    const account = await Account.create({
      name,
      balance: balance || 0,
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
    const { name, balance } = req.body;
    const { accountId } = req.params;

    const account = await Account.findOne({
      _id: accountId,
      user: req.user._id,
    });

    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    account.name = name;
    if (balance !== undefined) {
      account.balance = balance;
    }
    await account.save();

    res.json(account);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const updateBalance = async (req, res) => {
  try {
    const { balance } = req.body;
    const { accountId } = req.params;

    const account = await Account.findOne({
      _id: accountId,
      user: req.user._id,
    });

    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    account.balance = balance;
    await account.save();

    res.json(account);
  } catch (error) {
    res.status(400);
    throw error;
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findOne({
      _id: accountId,
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
