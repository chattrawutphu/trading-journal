import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

export const createTransaction = async(req, res) => {
    try {
        // For SvelteKit API endpoint compatibility
        const body = req.body instanceof ReadableStream ?
            await req.json() :
            req.body;

        const { accountId, type, amount, date, note } = body; // Include note

        const transactionDate = date ? new Date(date) : new Date(); // Parse date from user

        // Verify user owns the account
        const account = await Account.findById(accountId);
        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }

        // Update account balance
        if (type === 'deposit') {
            account.balance += parseFloat(amount);
        } else if (type === 'withdrawal') {
            /*if (account.balance < amount) {
              return res.status(400).json({
                success: false,
                error: 'Insufficient balance'
              });
            }*/
            account.balance -= parseFloat(amount);
        }

        // Create transaction
        const transaction = new Transaction({
            accountId,
            type,
            amount: parseFloat(amount),
            date: transactionDate, // Use parsed date
            note // Include note
        });

        await Promise.all([
            transaction.save(),
            account.save()
        ]);

        res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create transaction'
        });
    }
};

export const updateTransaction = async(req, res) => {
    try {
        const { transactionId } = req.params;
        const body = req.body instanceof ReadableStream ?
            await req.json() :
            req.body;

        const { type, amount, date } = body;

        const transactionDate = date ? new Date(date) : new Date();

        // Find the transaction
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Find the account
        const account = await Account.findById(transaction.accountId);
        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }

        // Revert old transaction
        if (transaction.type === 'deposit') {
            account.balance -= transaction.amount;
        } else if (transaction.type === 'withdrawal') {
            account.balance += transaction.amount;
        }

        // Apply new transaction
        if (type === 'deposit') {
            account.balance += parseFloat(amount);
        } else if (type === 'withdrawal') {
            account.balance -= parseFloat(amount);
        }

        // Update transaction
        transaction.type = type;
        transaction.amount = parseFloat(amount);
        if (date) {
            transaction.date = transactionDate;
        }

        await Promise.all([
            transaction.save(),
            account.save()
        ]);

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update transaction'
        });
    }
};

export const deleteTransaction = async(req, res) => {
    try {
        const { transactionId } = req.params;

        // Find the transaction
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Find the account
        const account = await Account.findById(transaction.accountId);
        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }

        // Revert transaction
        if (transaction.type === 'deposit') {
            account.balance -= transaction.amount;
        } else if (transaction.type === 'withdrawal') {
            account.balance += transaction.amount;
        }

        await Promise.all([
            Transaction.findByIdAndDelete(transactionId),
            account.save()
        ]);

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete transaction'
        });
    }
};

export const getTransactions = async(req, res) => {
    try {
        const { accountId } = req.params;
        const transactions = await Transaction.find({ accountId }).sort({ date: -1 });

        res.json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get transactions'
        });
    }
};