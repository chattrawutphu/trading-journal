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
    const processedOrderIds = new Set(); // Track processed order IDs

    // Ensure all timestamps are properly converted to numbers
    orders.forEach(order => {
        // Convert string timestamps to numbers if needed
        order.time = typeof order.time === 'string' ? parseInt(order.time) : Number(order.time);
        order.updateTime = typeof order.updateTime === 'string' ? parseInt(order.updateTime) : Number(order.updateTime);
        
        // Validate timestamps
        if (isNaN(order.time) || order.time <= 0) {
            console.error(`Invalid time for order ${order.orderId}: ${order.time}`);
            order.time = Date.now(); // Fallback to current time
        }
        
        if (isNaN(order.updateTime) || order.updateTime <= 0) {
            console.error(`Invalid updateTime for order ${order.orderId}: ${order.updateTime}`);
            order.updateTime = order.time; // Fallback to order time
        }
    });

    // กรองเฉพาะ orders ที่มีสถานะ FILLED
    const filledOrders = orders.filter(order => order.status === 'FILLED');
    
    // เรียงลำดับตาม updateTime (เวลาที่ order ถูก filled)
    filledOrders.sort((a, b) => a.updateTime - b.updateTime);
    
    // ดำเนินการกับแต่ละ order ตามลำดับเวลา
    for (const order of filledOrders) {
        // ข้าม orders ที่ประมวลผลไปแล้ว
        if (processedOrderIds.has(order.orderId)) {
            continue;
        }
        
        // เพิ่ม order นี้ลงในรายการที่ประมวลผลแล้ว
        processedOrderIds.add(order.orderId);
        
        const symbol = order.symbol;
        const positionSide = order.positionSide; // LONG หรือ SHORT
        const key = `${symbol}_${positionSide}`;
        const side = positionSide === 'LONG' ? 'LONG' : 'SHORT';
        
        // กรณีเป็นคำสั่ง OPEN POSITION (BUY สำหรับ LONG, SELL สำหรับ SHORT)
        if ((side === 'LONG' && order.side === 'BUY' && !order.reduceOnly) || 
            (side === 'SHORT' && order.side === 'SELL' && !order.reduceOnly)) {
            
            // ถ้ายังไม่มี position เปิดอยู่สำหรับ symbol และ side นี้
            if (!openPositions.has(key)) {
                // สร้าง position ใหม่
                openPositions.set(key, {
                    symbol: symbol,
                    side: side,
                    entryDate: order.time,
                    entryPrice: parseFloat(order.avgPrice),
                    quantity: parseFloat(order.executedQty),
                    orders: [order],
                    commission: parseFloat(order.commission || 0),
                    commissionAsset: order.commissionAsset,
                    status: 'OPEN',
                    pnl: 0,
                    price: parseFloat(order.avgPrice),
                    lastPriceUpdate: new Date(order.updateTime),
                    type: 'SYNC',
                    confidenceLevel: 1,
                    greedLevel: 1,
                    amount: parseFloat(order.avgPrice) * parseFloat(order.executedQty),
                    positionHistory: [{
                        date: new Date(order.updateTime).toISOString(),
                        quantity: parseFloat(order.executedQty),
                        percentage: 100,
                        price: parseFloat(order.avgPrice),
                        pnl: 0,
                        orderId: order.orderId,
                        action: 'INCREASE',
                        timestamp: order.updateTime
                    }],
                    lastDecreaseOrder: null
                });
            } else {
                // เพิ่มเข้าไปในตำแหน่งที่มีอยู่แล้ว
                const pos = openPositions.get(key);
                const newQty = parseFloat(order.executedQty);
                const totalQty = pos.quantity + newQty;
                const newPrice = parseFloat(order.avgPrice);
                
                // คำนวณราคาเฉลี่ยถ่วงน้ำหนัก
                pos.entryPrice = ((pos.entryPrice * pos.quantity) + (newPrice * newQty)) / totalQty;
                
                // เพิ่มในประวัติ position
                pos.positionHistory.push({
                    date: new Date(order.updateTime).toISOString(),
                    quantity: newQty,
                    percentage: (newQty / pos.quantity * 100).toFixed(2),
                    price: newPrice,
                    pnl: 0,
                    orderId: order.orderId,
                    action: 'INCREASE',
                    timestamp: order.updateTime
                });
                
                pos.quantity = totalQty;
                pos.amount = pos.entryPrice * totalQty;
                pos.orders.push(order);
                pos.commission += parseFloat(order.commission || 0);
            }
        }
        // กรณีเป็นคำสั่ง CLOSE POSITION (SELL สำหรับ LONG, BUY สำหรับ SHORT)
        else if ((side === 'LONG' && order.side === 'SELL' && order.reduceOnly) || 
                (side === 'SHORT' && order.side === 'BUY' && order.reduceOnly)) {
            
            if (openPositions.has(key)) {
                // มี position เปิดอยู่ ดำเนินการปิด position
                const pos = openPositions.get(key);
                const exitPrice = parseFloat(order.avgPrice);
                const closeQty = parseFloat(order.executedQty);
                
                if (exitPrice > 0) {
                    // คำนวณกำไร/ขาดทุน
                    let pnl;
                    if (side === 'LONG') {
                        pnl = (exitPrice - pos.entryPrice) * closeQty;
                    } else {
                        pnl = (pos.entryPrice - exitPrice) * closeQty;
                    }
                    
                    // ตรวจสอบว่าเป็นการปิดบางส่วนหรือทั้งหมด
                    const isPartialClose = closeQty < pos.quantity;
                    
                    if (isPartialClose) {
                        // ปิดบางส่วน
                        const initialQty = pos.quantity;
                        const closePercentage = (closeQty / initialQty) * 100;
                        
                        // บันทึกประวัติการปิดบางส่วน
                        pos.positionHistory.push({
                            date: new Date(order.updateTime).toISOString(),
                            quantity: closeQty,
                            percentage: closePercentage.toFixed(2),
                            price: exitPrice,
                            pnl: pnl,
                            orderId: order.orderId,
                            action: 'DECREASE',
                            timestamp: order.updateTime
                        });
                        
                        pos.quantity -= closeQty;
                        pos.amount = pos.entryPrice * pos.quantity;
                        pos.pnl += pnl;
                        pos.commission += parseFloat(order.commission || 0);
                        pos.orders.push(order);
                    } else {
                        // ปิดทั้งหมด
                        pos.positionHistory.push({
                            date: new Date(order.updateTime).toISOString(),
                            quantity: closeQty,
                            percentage: 100,
                            price: exitPrice,
                            pnl: pnl,
                            orderId: order.orderId,
                            action: 'DECREASE',
                            timestamp: order.updateTime
                        });
                        
                        // เรียงลำดับประวัติตามเวลา
                        pos.positionHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                        
                        // เพิ่ม position ที่ปิดแล้วลงในผลลัพธ์
                        positions.push({
                            ...pos,
                            exitDate: order.updateTime,
                            exitPrice: exitPrice,
                            price: exitPrice,
                            lastPriceUpdate: new Date(order.updateTime),
                            pnl: pos.pnl + pnl,
                            commission: pos.commission + parseFloat(order.commission || 0),
                            commissionAsset: order.commissionAsset || pos.commissionAsset,
                            status: 'CLOSED',
                            type: 'SYNC'
                        });
                        
                        // ลบ position ที่ปิดแล้วออกจากรายการ open positions
                        openPositions.delete(key);
                    }
                }
            } else {
                // ไม่พบ position ที่จะปิด - อาจเป็น order ที่สร้างก่อนแต่ถูก filled หลัง
                // สร้าง open position ใหม่และปิดทันที (เพื่อบันทึกประวัติ)
                const avgPrice = parseFloat(order.avgPrice);
                const qty = parseFloat(order.executedQty);
                
                // สร้าง position เปิดเทียม (จากคำสั่งปิด)
                const fakePosition = {
                    symbol: symbol,
                    side: side,
                    entryDate: order.time, // ใช้เวลาเดียวกับการปิด
                    entryPrice: avgPrice, // ใช้ราคาเดียวกับการปิด (ไม่มีกำไร/ขาดทุน)
                    quantity: qty,
                    orders: [order],
                    commission: parseFloat(order.commission || 0),
                    commissionAsset: order.commissionAsset,
                    status: 'CLOSED',
                    pnl: 0,
                    exitDate: order.updateTime,
                    exitPrice: avgPrice,
                    price: avgPrice,
                    lastPriceUpdate: new Date(order.updateTime),
                    type: 'SYNC',
                    confidenceLevel: 1,
                    greedLevel: 1,
                    amount: avgPrice * qty,
                    positionHistory: [
                        {
                            date: new Date(order.time).toISOString(),
                            quantity: qty,
                            percentage: 100,
                            price: avgPrice,
                            pnl: 0,
                            orderId: order.orderId,
                            action: 'INCREASE',
                            timestamp: order.time
                        },
                        {
                            date: new Date(order.updateTime).toISOString(),
                            quantity: qty,
                            percentage: 100,
                            price: avgPrice,
                            pnl: 0,
                            orderId: order.orderId,
                            action: 'DECREASE',
                            timestamp: order.updateTime
                        }
                    ]
                };
                
                positions.push(fakePosition);
                // console.log(`Created and closed synthetic position for ${symbol} ${side} from close order ${order.orderId}`);
            }
        }
    }
    
    // เพิ่ม position ที่ยังเปิดอยู่ลงในผลลัพธ์
    for (const [key, pos] of openPositions) {
        // เรียงลำดับประวัติตามเวลา
        pos.positionHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        positions.push({
            ...pos,
            status: 'OPEN',
            exitDate: null,
            exitPrice: null,
            price: null
        });
    }
    
    // ตรวจสอบวันที่ปิดล่าสุดสำหรับ position ที่ปิดแล้ว
    positions.forEach(position => {
        if (position.status === 'CLOSED' && position.positionHistory && position.positionHistory.length > 0) {
            const decreaseActions = position.positionHistory.filter(entry => entry.action === 'DECREASE');
            if (decreaseActions.length > 0) {
                decreaseActions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                const latestDecrease = decreaseActions[0];
                if (latestDecrease && latestDecrease.timestamp) {
                    position.exitDate = latestDecrease.timestamp;
                }
            }
        }
    });
    
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