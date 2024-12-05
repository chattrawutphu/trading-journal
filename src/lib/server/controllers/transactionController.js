import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

export const createTransaction = async (req, res) => {
  try {
    // For SvelteKit API endpoint compatibility
    const body = req.body instanceof ReadableStream 
      ? await req.json()
      : req.body;

    const { accountId, type, amount } = body;

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
      if (account.balance < amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient balance'
        });
      }
      account.balance -= parseFloat(amount);
    }

    // Create transaction
    const transaction = new Transaction({
      accountId,
      type,
      amount: parseFloat(amount)
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

export const getTransactions = async (req, res) => {
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
