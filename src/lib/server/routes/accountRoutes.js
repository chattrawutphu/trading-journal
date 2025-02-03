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

// Add this function before the test-connection route
async function getBinanceServerTime() {
    try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/time');
        if (!response.ok) {
            throw new Error('Failed to fetch Binance server time');
        }
        const data = await response.json();
        return data.serverTime;
    } catch (error) {
        console.error('Error fetching Binance server time:', error);
        throw error;
    }
}

// Modify the test-connection route
router.post('/test-connection', async(req, res) => {
    try {
        const { type, apiKey, secretKey } = req.body;

        if (type === 'BINANCE_FUTURES') {
            // Get Binance server time
            const serverTime = await getBinanceServerTime();

            const queryString = `timestamp=${serverTime}`;
            const signature = createSignature(secretKey, queryString);

            const url = new URL('https://fapi.binance.com/fapi/v2/account');
            url.searchParams.append('timestamp', serverTime);
            url.searchParams.append('signature', signature);

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

// Modify the binance-history route
router.post('/binance-history', async(req, res) => {
    try {
        const { apiKey, secretKey } = req.body;

        // Get Binance server time
        const serverTime = await getBinanceServerTime();

        // Set start time to 3 months ago (Binance Futures API limit)
        const startTime = serverTime - (90 * 24 * 60 * 60 * 1000); // 90 days ago

        const queryString = `limit=1000&startTime=${startTime}&timestamp=${serverTime}`;
        const signature = createSignature(secretKey, queryString);

        const url = new URL('https://fapi.binance.com/fapi/v1/userTrades');
        url.searchParams.append('limit', '1000');
        url.searchParams.append('startTime', startTime);
        url.searchParams.append('timestamp', serverTime);
        url.searchParams.append('signature', signature);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': apiKey
            }
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Binance Futures API Error:', error);
            throw new Error(error.msg || 'Failed to fetch futures trade history');
        }

        const trades = await response.json();

        if (!trades || trades.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalTrades: 0,
                    symbols: [],
                    startDate: new Date(startTime).toISOString(),
                    endDate: new Date(serverTime).toISOString(),
                    trades: []
                }
            });
        }

        const symbols = [...new Set(trades.map(trade => trade.symbol))];
        const startDate = new Date(Math.min(...trades.map(t => t.time))).toISOString();
        const endDate = new Date(Math.max(...trades.map(t => t.time))).toISOString();

        const processedTrades = trades.map(trade => ({
            symbol: trade.symbol,
            side: trade.side,
            price: parseFloat(trade.price),
            qty: parseFloat(trade.qty),
            realizedPnl: parseFloat(trade.realizedPnl),
            commission: parseFloat(trade.commission),
            commissionAsset: trade.commissionAsset,
            time: trade.time,
            positionSide: trade.positionSide,
            orderId: trade.orderId,
            type: 'FUTURES'
        }));

        res.json({
            success: true,
            data: {
                totalTrades: processedTrades.length,
                symbols,
                startDate,
                endDate,
                trades: processedTrades
            }
        });
    } catch (error) {
        console.error('Fetch futures history error:', error);
        res.status(400).json({
            message: error.message || 'Failed to fetch futures trade history',
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
    try {
        return crypto
            .createHmac('sha256', secretKey)
            .update(queryString)
            .digest('hex');
    } catch (error) {
        console.error('Error creating signature:', error);
        throw new Error('Failed to create signature');
    }
}

export default router;