// server/controllers/accountController.js
import Account from '../models/Account.js';
import Trade from '../models/Trade.js';
import Layout from '../models/Layout.js';
import mongoose from 'mongoose';

const handleError = (res, error) => {
    console.error('Account Error:', error);
    const statusCode = error.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
};

export const getAccounts = async(req, res) => {
    try {
        const accounts = await Account.find({ user: req.user._id });
        res.json(accounts);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const getAccount = async(req, res) => {
    try {
        const { id } = req.params;
        const account = await Account.findOne({
            _id: id,
            user: req.user._id,
        });

        if (!account) {
            res.status(404);
            return handleError(res, new Error('Account not found'));
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
        handleError(res, error);
    }
};

export const createAccount = async(req, res) => {
    try {
        const { trades, ...accountData } = req.body;

        // Create the account
        const account = await Account.create({
            ...accountData,
            user: req.user._id,
            symbols: [] // Initialize empty symbols array
        });

        // If trades were provided, import them
        if (trades && trades.length > 0) {
            await account.importTrades(trades);

            // Extract unique symbols from trades
            const symbols = [...new Set(trades.map(trade => trade.symbol))];
            account.symbols = symbols;
            await account.save();
        }

        res.status(201).json(account);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const updateAccount = async(req, res) => {
    try {
        const { id } = req.params;
        const account = await Account.findOne({
            _id: id,
            user: req.user._id,
        });

        if (!account) {
            res.status(404);
            return handleError(res, new Error('Account not found'));
        }

        const updatedAccount = await Account.findByIdAndUpdate(id, req.body, {
            new: true,
        });
        res.json(updatedAccount);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const updateBalance = async(req, res) => {
    try {
        const { id } = req.params;
        const { balance } = req.body;

        const account = await Account.findOne({
            _id: id,
            user: req.user._id,
        });

        if (!account) {
            res.status(404);
            return handleError(res, new Error('Account not found'));
        }

        account.balance = balance;
        const updatedAccount = await account.save();
        res.json(updatedAccount);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const deleteAccount = async(req, res) => {
    const accountId = req.params.id;

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Delete the account
        const account = await Account.findByIdAndDelete(accountId).session(session);
        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Account not found'
            });
        }

        // Delete all trades associated with this account
        await Trade.deleteMany({ account: accountId }).session(session);

        // Delete all layouts associated with this account
        await Layout.deleteMany({ account: accountId }).session(session);

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Account and all associated data deleted successfully'
        });
    } catch (error) {
        // If an error occurs, abort the transaction
        await session.abortTransaction();
        session.endSession();

        console.error('Error deleting account:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete account'
        });
    }
};

// New functions for managing symbols
export const getSymbols = async(req, res) => {
    try {
        const { id } = req.params;
        const account = await Account.findOne({
            _id: id,
            user: req.user._id,
        });

        if (!account) {
            res.status(404);
            return handleError(res, new Error('Account not found'));
        }

        res.json(account.symbols);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const updateSymbols = async(req, res) => {
    try {
        const { id } = req.params;
        const { symbols } = req.body;

        const account = await Account.findOne({
            _id: id,
            user: req.user._id,
        });

        if (!account) {
            res.status(404);
            return handleError(res, new Error('Account not found'));
        }

        account.symbols = symbols;
        const updatedAccount = await account.save();
        res.json(updatedAccount.symbols);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const addSymbol = async(req, res) => {
    try {
        const { id } = req.params;
        const { symbol } = req.body;

        const account = await Account.findOne({
            _id: id,
            user: req.user._id,
        });

        if (!account) {
            res.status(404);
            return handleError(res, new Error('Account not found'));
        }

        if (!account.symbols.includes(symbol)) {
            account.symbols.push(symbol);
            await account.save();
        }

        res.json(account.symbols);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};

export const removeSymbol = async(req, res) => {
    try {
        const { id, symbol } = req.params;

        const account = await Account.findOne({
            _id: id,
            user: req.user._id,
        });

        if (!account) {
            res.status(404);
            return handleError(res, new Error('Account not found'));
        }

        account.symbols = account.symbols.filter(s => s !== symbol);
        await account.save();

        res.json(account.symbols);
    } catch (error) {
        res.status(400);
        handleError(res, error);
    }
};