// server/routes/accountRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    getAccounts,
    getAccount,
    createAccount,
    updateAccount,
    updateBalance,
    deleteAccount,
    getSymbols,
    updateSymbols,
    addSymbol,
    removeSymbol
} from '../controllers/accountController.js';
import crypto from 'crypto';

const router = express.Router();

router.post('/test-connection', async(req, res) => {
    try {
        const { type, apiKey, secretKey } = req.body;

        if (type === 'BINANCE_FUTURES') {
            // สร้าง timestamp และ signature
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}`;
            const signature = createSignature(secretKey, queryString);

            // สร้าง URL พร้อม query parameters
            const url = new URL('https://fapi.binance.com/fapi/v2/account');
            url.searchParams.append('timestamp', timestamp);
            url.searchParams.append('signature', signature);

            // เรียก Binance API
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'X-MBX-APIKEY': apiKey
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.msg || 'Invalid API credentials');
            }

            const data = await response.json();
            res.json({
                success: true,
                data: {
                    totalWalletBalance: data.totalWalletBalance,
                    totalUnrealizedProfit: data.totalUnrealizedProfit
                }
            });
        } else {
            throw new Error('Unsupported exchange type');
        }
    } catch (error) {
        console.error('Test connection error:', error);
        res.status(400).json({
            message: error.message || 'Failed to test connection',
            error: error
        });
    }
});

router.use(protect);

router.route('/')
    .get(getAccounts)
    .post(createAccount);

router.route('/:id')
    .get(getAccount)
    .put(updateAccount)
    .delete(deleteAccount);

router.route('/:id/balance')
    .put(updateBalance);

// New symbol management routes
router.route('/:id/symbols')
    .get(getSymbols)
    .put(updateSymbols)
    .post(addSymbol);

router.route('/:id/symbols/:symbol')
    .delete(removeSymbol);

// Helper function to create signature using ES modules syntax
function createSignature(secretKey, queryString) {
    return crypto
        .createHmac('sha256', secretKey)
        .update(queryString)
        .digest('hex');
}

export default router;