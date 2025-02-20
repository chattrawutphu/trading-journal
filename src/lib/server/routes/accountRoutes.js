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
        console.log('Binance server time:', new Date(data.serverTime).toLocaleString());
        return data.serverTime;
    } catch (error) {
        console.error('Error fetching Binance server time:', error);
        // Fallback to local time if Binance API fails
        return Date.now();
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

// เพิ่มฟังก์ชันใหม่สำหรับดึง futures order history
async function getBinanceFuturesOrderHistory(apiKey, secretKey, startTime, endTime) {
    try {
        const allOrders = [];
        let currentStartTime = startTime;
        
        // Binance API allows maximum 7 days per request
        const maxInterval = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        while (currentStartTime < endTime) {
            const currentEndTime = Math.min(currentStartTime + maxInterval, endTime);
            
            const serverTime = await getBinanceServerTime();
            const queryString = `limit=${process.env.BINANCE_FUTURES_ORDER_LIMIT}&startTime=${currentStartTime}&endTime=${currentEndTime}&timestamp=${serverTime}`;
            const signature = createSignature(secretKey, queryString);

            const url = new URL('https://fapi.binance.com/fapi/v1/allOrders');
            url.searchParams.append('limit', process.env.BINANCE_FUTURES_ORDER_LIMIT);
            url.searchParams.append('startTime', currentStartTime);
            url.searchParams.append('endTime', currentEndTime);
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
                throw new Error(error.msg || 'Failed to fetch futures order history');
            }

            const orders = await response.json();
            allOrders.push(...orders);
            
            // Move to next interval
            currentStartTime = currentEndTime + 1;
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        return allOrders;
    } catch (error) {
        console.error('Error fetching futures order history:', error);
        throw error;
    }
}

// ปรับปรุง route binance-history
router.post('/binance-history', async(req, res) => {
    try {
        const { apiKey, secretKey } = req.body;
        const serverTime = await getBinanceServerTime();
        
        // Get days from environment variable
        const days = parseInt(process.env.BINANCE_FUTURES_ORDER_DAYS) || 7;
        const endTime = Date.now(); // ใช้เวลาปัจจุบันของ server แทน serverTime
        const startTime = endTime - (days * 24 * 60 * 60 * 1000);

        // Log วันที่และเวลาที่ใช้ในการเรียกข้อมูล
        console.log('Fetching Binance history:', {
            startTime: new Date(startTime).toLocaleString(),
            endTime: new Date(endTime).toLocaleString(),
            days: days,
            currentTime: new Date().toLocaleString(),
            serverTime: new Date(serverTime).toLocaleString()
        });

        // ดึงข้อมูล order history
        const orders = await getBinanceFuturesOrderHistory(apiKey, secretKey, startTime, endTime);

        if (!orders || orders.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalTrades: 0,
                    symbols: [],
                    startDate: new Date(startTime).toISOString(),
                    endDate: new Date(endTime).toISOString(),
                    trades: []
                }
            });
        }

        // Process orders into positions
        const positions = processOrdersToPositions(orders);

        const symbols = [...new Set(positions.map(pos => pos.symbol))];
        const startDate = new Date(Math.min(...positions.map(pos => pos.entryDate))).toISOString();
        const endDate = new Date(Math.max(...positions.map(pos => pos.exitDate))).toISOString();

        res.json({
            success: true,
            data: {
                totalTrades: positions.length,
                symbols,
                startDate,
                endDate,
                trades: positions
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

// ปรับปรุงฟังก์ชัน processOrdersToPositions
function processOrdersToPositions(orders) {
    const positions = [];
    const openPositions = new Map();

    // เรียงลำดับ orders ตามเวลา
    orders.sort((a, b) => a.time - b.time);

    for (const order of orders) {
        // ตรวจสอบเฉพาะ orders ที่ execute แล้ว
        if (!['FILLED'].includes(order.status)) continue;

        const key = `${order.symbol}_${order.positionSide}`;

        // Handle both LONG and SHORT positions
        if (order.positionSide === 'LONG') {
            if (order.side === 'BUY') {
                // เปิด position LONG
                if (!openPositions.has(key)) {
                    openPositions.set(key, {
                        symbol: order.symbol,
                        side: 'LONG',
                        entryDate: order.time,
                        entryPrice: parseFloat(order.avgPrice),
                        quantity: parseFloat(order.executedQty),
                        orders: [order],
                        commission: parseFloat(order.commission),
                        commissionAsset: order.commissionAsset,
                        status: 'OPEN',
                        pnl: 0,
                        price: parseFloat(order.price || order.avgPrice),
                        lastPriceUpdate: new Date(order.time),
                        type: 'SYNC',
                        confidenceLevel: 5,
                        greedLevel: 5
                    });
                } else {
                    // เพิ่ม position LONG
                    const pos = openPositions.get(key);
                    const totalQty = pos.quantity + parseFloat(order.executedQty);
                    pos.entryPrice = ((pos.entryPrice * pos.quantity) + 
                        (parseFloat(order.avgPrice) * parseFloat(order.executedQty))) / totalQty;
                    pos.quantity = totalQty;
                    pos.orders.push(order);
                    pos.commission += parseFloat(order.commission);
                }
            } else if (order.side === 'SELL' && order.reduceOnly) {
                // ปิด position LONG
                if (openPositions.has(key)) {
                    const pos = openPositions.get(key);
                    const exitPrice = parseFloat(order.avgPrice);
                    
                    // ตรวจสอบว่า exitPrice ต้องไม่เป็น 0
                    if (exitPrice > 0) {
                        const pnl = (exitPrice - pos.entryPrice) * pos.quantity;

                        positions.push({
                            ...pos,
                            exitDate: order.time,
                            exitPrice,
                            price: exitPrice,
                            lastPriceUpdate: new Date(order.time),
                            pnl,
                            commission: pos.commission + parseFloat(order.commission),
                            commissionAsset: order.commissionAsset,
                            type: 'SYNC',
                            status: 'CLOSED',
                            confidenceLevel: pos.confidenceLevel,
                            greedLevel: pos.greedLevel
                        });

                        openPositions.delete(key);
                    }
                }
            }
        } else if (order.positionSide === 'SHORT') {
            // ทำในลักษณะเดียวกันสำหรับ SHORT position
            if (order.side === 'SELL') {
                if (!openPositions.has(key)) {
                    openPositions.set(key, {
                        symbol: order.symbol,
                        side: 'SHORT',
                        entryDate: order.time,
                        entryPrice: parseFloat(order.avgPrice),
                        quantity: parseFloat(order.executedQty),
                        orders: [order],
                        commission: parseFloat(order.commission),
                        commissionAsset: order.commissionAsset,
                        status: 'OPEN',
                        pnl: 0,
                        price: parseFloat(order.price || order.avgPrice),
                        lastPriceUpdate: new Date(order.time),
                        type: 'SYNC',
                        confidenceLevel: 5,
                        greedLevel: 5
                    });
                } else {
                    const pos = openPositions.get(key);
                    const totalQty = pos.quantity + parseFloat(order.executedQty);
                    pos.entryPrice = ((pos.entryPrice * pos.quantity) + 
                        (parseFloat(order.avgPrice) * parseFloat(order.executedQty))) / totalQty;
                    pos.quantity = totalQty;
                    pos.orders.push(order);
                    pos.commission += parseFloat(order.commission);
                }
            } else if (order.side === 'BUY' && order.reduceOnly) {
                if (openPositions.has(key)) {
                    const pos = openPositions.get(key);
                    const exitPrice = parseFloat(order.avgPrice);
                    
                    // ตรวจสอบว่า exitPrice ต้องไม่เป็น 0
                    if (exitPrice > 0) {
                        const pnl = (pos.entryPrice - exitPrice) * pos.quantity;

                        positions.push({
                            ...pos,
                            exitDate: order.time,
                            exitPrice,
                            price: exitPrice,
                            lastPriceUpdate: new Date(order.time),
                            pnl,
                            commission: pos.commission + parseFloat(order.commission),
                            commissionAsset: order.commissionAsset,
                            type: 'SYNC',
                            status: 'CLOSED',
                            confidenceLevel: pos.confidenceLevel,
                            greedLevel: pos.greedLevel
                        });

                        openPositions.delete(key);
                    }
                }
            }
        }
    }

    // เพิ่ม open positions ที่ยังไม่ถูกปิด
    for (const [key, pos] of openPositions) {
        positions.push({
            ...pos,
            status: 'OPEN',
            exitDate: null,
            exitPrice: null,
            price: null
        });
    }

    return positions;
}

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