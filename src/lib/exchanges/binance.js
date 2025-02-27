// Binance Exchange Integration
import crypto from 'crypto';

// Constants
const BINANCE_FUTURES_BASE_URL = 'https://fapi.binance.com';
const BINANCE_FUTURES_WS_URL = 'wss://fstream.binance.com/ws';

/**
 * Create HMAC signature for Binance API
 */
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

/**
 * Get Binance server time
 */
async function getBinanceServerTime() {
    try {
        const response = await fetch(`${BINANCE_FUTURES_BASE_URL}/fapi/v1/time`);
        if (!response.ok) {
            throw new Error('Failed to fetch Binance server time');
        }
        const data = await response.json();
        // console.log('Binance server time:', new Date(data.serverTime).toLocaleString());
        return data.serverTime;
    } catch (error) {
        console.error('Error fetching Binance server time:', error);
        // Fallback to local time if Binance API fails
        return Date.now();
    }
}

/**
 * Test Binance API connection
 */
async function testConnection(apiKey, secretKey) {
    try {
        const serverTime = await getBinanceServerTime();
        const queryString = `timestamp=${serverTime}`;
        const signature = createSignature(secretKey, queryString);

        const url = new URL(`${BINANCE_FUTURES_BASE_URL}/fapi/v2/account`);
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
        return {
            success: true,
            data: {
                totalWalletBalance: data.totalWalletBalance,
                totalUnrealizedProfit: data.totalUnrealizedProfit
            }
        };
    } catch (error) {
        console.error('Test connection error:', error);
        return {
            success: false,
            message: error.message || 'Failed to test connection'
        };
    }
}

/**
 * Get Binance Futures order history
 */
async function getFuturesOrderHistory(apiKey, secretKey, startTime, endTime) {
    try {
        const allOrders = [];
        let currentStartTime = startTime;
        
        // Binance API allows maximum 7 days per request
        const maxInterval = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        while (currentStartTime < endTime) {
            const currentEndTime = Math.min(currentStartTime + maxInterval, endTime);
            
            const serverTime = await getBinanceServerTime();
            const queryString = `limit=1000&startTime=${currentStartTime}&endTime=${currentEndTime}&timestamp=${serverTime}`;
            const signature = createSignature(secretKey, queryString);

            const url = new URL(`${BINANCE_FUTURES_BASE_URL}/fapi/v1/allOrders`);
            url.searchParams.append('limit', '1000');
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

/**
 * Process orders into positions
 */
function processOrdersToPositions(orders) {
    const positions = [];
    const openPositions = new Map();

    // Sort orders by time
    orders.sort((a, b) => a.time - b.time);

    for (const order of orders) {
        // Only process filled orders
        if (!['FILLED'].includes(order.status)) continue;

        const key = `${order.symbol}_${order.positionSide}`;

        // Handle both LONG and SHORT positions
        if (order.positionSide === 'LONG') {
            if (order.side === 'BUY') {
                // Open LONG position
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
                        confidenceLevel: 1,
                        greedLevel: 1,
                        amount: parseFloat(order.avgPrice) * parseFloat(order.executedQty),
                        positionHistory: [{
                            date: new Date(order.updateTime || order.time).toISOString(),
                            quantity: parseFloat(order.executedQty),
                            percentage: 100,
                            price: parseFloat(order.avgPrice),
                            pnl: 0,
                            orderId: order.orderId,
                            action: 'INCREASE'
                        }]
                    });
                } else {
                    // Add to LONG position
                    const pos = openPositions.get(key);
                    const newQty = parseFloat(order.executedQty);
                    const totalQty = pos.quantity + newQty;
                    const newPrice = parseFloat(order.avgPrice);
                    
                    // Calculate weighted average entry price
                    pos.entryPrice = ((pos.entryPrice * pos.quantity) + 
                        (newPrice * newQty)) / totalQty;
                    
                    // Add this increase to positionHistory
                    pos.positionHistory.push({
                        date: new Date(order.updateTime || order.time).toISOString(),
                        quantity: newQty,
                        percentage: (newQty / pos.quantity * 100).toFixed(2),
                        price: newPrice,
                        pnl: 0,
                        orderId: order.orderId,
                        action: 'INCREASE'
                    });
                    
                    pos.quantity = totalQty;
                    pos.orders.push(order);
                    pos.commission += parseFloat(order.commission);
                }
            } else if (order.side === 'SELL' && order.reduceOnly) {
                // Close or partially close LONG position
                if (openPositions.has(key)) {
                    const pos = openPositions.get(key);
                    const exitPrice = parseFloat(order.avgPrice);
                    const closeQty = parseFloat(order.executedQty);
                    
                    if (exitPrice > 0) {
                        // Check if this is a partial close or full close
                        const isPartialClose = closeQty < pos.quantity;
                        const pnl = (exitPrice - pos.entryPrice) * closeQty;

                        if (isPartialClose) {
                            // For partial close, reduce the position quantity but keep it open
                            const initialQty = pos.quantity;
                            const closePercentage = (closeQty / initialQty) * 100;
                            
                            // Track this partial close in history
                            pos.positionHistory.push({
                                date: new Date(order.updateTime).toISOString(),
                                quantity: closeQty,
                                percentage: closePercentage.toFixed(2),
                                price: exitPrice,
                                pnl: pnl,
                                orderId: order.orderId,
                                action: 'DECREASE'
                            });
                            
                            pos.quantity -= closeQty;
                            pos.amount = pos.entryPrice * pos.quantity; // Update amount
                            pos.pnl += pnl;
                            pos.commission += parseFloat(order.commission);
                            pos.orders.push(order);
                        } else {
                            // For full close, mark as closed and remove from open positions
                            // Track the final close in history
                            pos.positionHistory.push({
                                date: new Date(order.updateTime).toISOString(),
                                quantity: closeQty,
                                percentage: 100,
                                price: exitPrice,
                                pnl: pnl,
                                orderId: order.orderId,
                                action: 'DECREASE'
                            });
                            
                            positions.push({
                                ...pos,
                                exitDate: order.updateTime,
                                exitPrice,
                                price: exitPrice,
                                lastPriceUpdate: new Date(order.updateTime),
                                pnl: pos.pnl + pnl,
                                commission: pos.commission + parseFloat(order.commission),
                                commissionAsset: order.commissionAsset,
                                type: 'SYNC',
                                status: 'CLOSED',
                                positionHistory: pos.positionHistory
                            });

                            openPositions.delete(key);
                        }
                    }
                }
            }
        } else if (order.positionSide === 'SHORT') {
            // Similar logic for SHORT positions
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
                        confidenceLevel: 1,
                        greedLevel: 1,
                        amount: parseFloat(order.avgPrice) * parseFloat(order.executedQty),
                        positionHistory: [{
                            date: new Date(order.updateTime || order.time).toISOString(),
                            quantity: parseFloat(order.executedQty),
                            percentage: 100,
                            price: parseFloat(order.avgPrice),
                            pnl: 0,
                            orderId: order.orderId,
                            action: 'INCREASE'
                        }]
                    });
                } else {
                    const pos = openPositions.get(key);
                    const newQty = parseFloat(order.executedQty);
                    const totalQty = pos.quantity + newQty;
                    const newPrice = parseFloat(order.avgPrice);
                    
                    // Add this increase to positionHistory
                    pos.positionHistory.push({
                        date: new Date(order.updateTime || order.time).toISOString(),
                        quantity: newQty,
                        percentage: (newQty / pos.quantity * 100).toFixed(2),
                        price: newPrice,
                        pnl: 0,
                        orderId: order.orderId,
                        action: 'INCREASE'
                    });
                    
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
                    const closeQty = parseFloat(order.executedQty);
                    
                    if (exitPrice > 0) {
                        // Check if this is a partial close or full close
                        const isPartialClose = closeQty < pos.quantity;
                        const pnl = (pos.entryPrice - exitPrice) * closeQty;

                        if (isPartialClose) {
                            // For partial close, reduce the position quantity but keep it open
                            const initialQty = pos.quantity;
                            const closePercentage = (closeQty / initialQty) * 100;
                            
                            // Track this partial close in history
                            pos.positionHistory.push({
                                date: new Date(order.updateTime).toISOString(),
                                quantity: closeQty,
                                percentage: closePercentage.toFixed(2),
                                price: exitPrice,
                                pnl: pnl,
                                orderId: order.orderId,
                                action: 'DECREASE'
                            });
                            
                            pos.quantity -= closeQty;
                            pos.amount = pos.entryPrice * pos.quantity; // Update amount
                            pos.pnl += pnl;
                            pos.commission += parseFloat(order.commission);
                            pos.orders.push(order);
                        } else {
                            // For full close, mark as closed and remove from open positions
                            // Track the final close in history
                            pos.positionHistory.push({
                                date: new Date(order.updateTime).toISOString(),
                                quantity: closeQty,
                                percentage: 100,
                                price: exitPrice,
                                pnl: pnl,
                                orderId: order.orderId,
                                action: 'DECREASE'
                            });
                            
                            positions.push({
                                ...pos,
                                exitDate: order.updateTime,
                                exitPrice,
                                price: exitPrice,
                                lastPriceUpdate: new Date(order.updateTime),
                                pnl: pos.pnl + pnl,
                                commission: pos.commission + parseFloat(order.commission),
                                commissionAsset: order.commissionAsset,
                                type: 'SYNC',
                                status: 'CLOSED',
                                positionHistory: pos.positionHistory
                            });

                            openPositions.delete(key);
                        }
                    }
                }
            }
        }
    }

    // Add remaining open positions
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

/**
 * Create WebSocket connection for real-time price updates
 */
function createPriceWebSocket(symbols) {
    const ws = new WebSocket(`${BINANCE_FUTURES_WS_URL}/${symbols.map(s => `${s.toLowerCase()}@markPrice`).join('/')}`);
    return ws;
}

/**
 * Calculate unrealized PnL for a position
 */
function calculateUnrealizedPnL(position, currentPrice) {
    if (!currentPrice) return null;
    const qty = position.quantity;
    if (position.side === 'LONG') {
        return (currentPrice - position.entryPrice) * qty;
    } else {
        return (position.entryPrice - currentPrice) * qty;
    }
}

export const binanceExchange = {
    testConnection,
    getFuturesOrderHistory,
    processOrdersToPositions,
    createPriceWebSocket,
    calculateUnrealizedPnL,
    getBinanceServerTime
}; 