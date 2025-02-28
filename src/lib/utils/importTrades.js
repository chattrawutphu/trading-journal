// Utility functions for importing trades

// เพิ่ม import สำหรับ layoutStore
import { layoutStore } from '$lib/stores/layoutStore';

/**
 * Format trades from various sources into a consistent format
 * @param {Array} trades - Array of trade objects to format
 * @param {boolean} isFromExchange - Whether trades are from an exchange (affects orderId handling)
 * @param {Array} existingOrderIds - Array of existing orderIds to check for duplicates
 * @param {boolean} checkDuplicates - Whether to check for duplicates
 * @param {boolean} excludeZeroPnL - Whether to exclude trades with zero PnL
 * @returns {Array} Array of formatted trade objects
 */
export function formatTrades(trades, isFromExchange = true, existingOrderIds = [], checkDuplicates = true, excludeZeroPnL = false) {
    // console.log('Format trades options:', { isFromExchange, checkDuplicates, excludeZeroPnL });

    const existingOrderIdsSet = new Set(
        Array.isArray(existingOrderIds) ?
        existingOrderIds.map(id => String(id).toLowerCase()) :
        existingOrderIds
    );

    const processedOrderIds = new Set();
    const duplicates = new Set();
    const newTradeIds = new Set();

    const formattedTrades = trades.map((trade, index) => {
        try {
            const orderId = String(trade.orders?.[0]?.orderId || trade.orderId).toLowerCase();

            // Basic validation
            if (!trade || typeof trade !== 'object') {
                console.error(`Trade at index ${index} is invalid:`, trade);
                return null;
            }

            // Validate and normalize orderId
            if (!orderId) {
                console.error(`Missing orderId at index ${index}:`, trade);
                return null;
            }

            // Check duplicates
            if (checkDuplicates) {
                if (existingOrderIdsSet.has(orderId) || processedOrderIds.has(orderId)) {
                    duplicates.add(orderId);
                    // console.log(`Duplicate found: ${orderId}`);
                    return null;
                }
            }

            // Add to processed set
            processedOrderIds.add(orderId);
            newTradeIds.add(orderId);

            // Validate required numeric values
            if (!Number.isFinite(trade.entryPrice) || trade.entryPrice <= 0) {
                console.error(`Invalid entry price at index ${index}:`, trade.entryPrice);
                return null;
            }

            if (!Number.isFinite(trade.quantity) || trade.quantity === 0) {
                console.error(`Invalid quantity at index ${index}:`, trade.quantity);
                return null;
            }

            if (!trade.entryDate || isNaN(new Date(trade.entryDate).getTime())) {
                console.error(`Invalid entry date at index ${index}:`, trade.entryDate);
                return null;
            }

            // Calculate amount
            const amount = Math.abs(trade.entryPrice * trade.quantity);

            // Make sure the positionHistory exists for all trades
            let positionHistory = trade.positionHistory || [];
            
            // If there's no position history, create a default one for both OPEN and CLOSED trades
            if (positionHistory.length === 0) {
                // Create an initial INCREASE entry for entry
                positionHistory.push({
                    date: new Date(trade.entryDate).toISOString(),
                    quantity: Math.abs(trade.quantity),
                    percentage: 100,
                    price: trade.entryPrice,
                    pnl: 0,
                    orderId: orderId,
                    action: 'INCREASE'
                });
                
                // For CLOSED trades, add a DECREASE entry for exit
                if (trade.status === 'CLOSED' && trade.exitDate && trade.exitPrice) {
                    positionHistory.push({
                        date: new Date(trade.exitDate).toISOString(),
                        quantity: Math.abs(trade.quantity),
                        percentage: 100,
                        price: trade.exitPrice,
                        pnl: trade.pnl || 0,
                        orderId: orderId,
                        action: 'DECREASE'
                    });
                }
                
                // console.log(`Created default position history for trade ${orderId}:`, positionHistory);
            }

            // Skip PnL check for OPEN positions
            if (trade.status === 'OPEN') {
                return {
                    ...trade,
                    orderId: orderId,
                    amount: amount,
                    entryDate: new Date(trade.entryDate).toISOString(),
                    exitDate: trade.exitDate ? new Date(trade.exitDate).toISOString() : null,
                    positionHistory: positionHistory // Ensure positionHistory is included
                };
            }

            // Log before checking PnL
            if (excludeZeroPnL) {
                /*console.log(`Checking PnL for trade ${orderId}:`, {
                    pnl: trade.pnl,
                    amount: amount,
                    isZero: isEffectivelyZeroPnL(trade.pnl, amount)
                });*/
            }

            // Skip trades with zero/negligible PnL
            if (excludeZeroPnL && isEffectivelyZeroPnL(trade.pnl, amount)) {
                // console.log(`Skipping trade ${orderId} due to zero/negligible PnL`);
                return null;
            }

            // Calculate entry price from realized PnL for futures trades
            let entryPrice = trade.price; // Default to exit price
            if (trade.type === 'FUTURES' && trade.realizedPnl !== undefined) {
                // For SHORT: entryPrice = exitPrice + (realizedPnl / qty)
                // For LONG: entryPrice = exitPrice - (realizedPnl / qty)
                const pnlPerUnit = trade.realizedPnl / trade.qty;
                entryPrice = trade.side === 'SELL' ?
                    trade.price + pnlPerUnit // SHORT
                    :
                    trade.price - pnlPerUnit; // LONG
            }

            // ใช้ข้อมูลจาก position ที่คำนวณแล้ว
            const formattedTrade = {
                orderId: orderId,
                symbol: trade.symbol,
                side: trade.side,
                status: trade.status || 'CLOSED',
                type: 'SYNC',
                entryDate: new Date(trade.entryDate).toISOString(),
                exitDate: new Date(trade.exitDate).toISOString(),
                quantity: Math.abs(trade.quantity),
                amount: amount,
                entryPrice: trade.entryPrice,
                exitPrice: trade.exitPrice,
                pnl: trade.pnl || 0,
                commission: trade.commission || 0,
                commissionAsset: trade.commissionAsset || 'USDT',
                confidenceLevel: Math.max(trade.confidenceLevel || 1, 1),
                greedLevel: Math.max(trade.greedLevel || 1, 1),
                positionHistory: positionHistory // Always include position history
            };

            // Log the trade details for debugging
            /*console.log('Formatted trade:', {
                orderId: formattedTrade.orderId,
                symbol: formattedTrade.symbol,
                status: formattedTrade.status,
                positionHistory: formattedTrade.positionHistory.length
            });*/

            return formattedTrade;
        } catch (error) {
            console.error(`Error formatting trade at index ${index}:`, error, trade);
            return null;
        }
    }).filter(trade => trade !== null);

    if (duplicates.size > 0) {
        // console.log(`Found ${duplicates.size} duplicate trades`);
    }

    return formattedTrades;
}

/**
 * Check for duplicate trades based on orderId
 * @param {Array} existingTrades - Array of existing trades
 * @param {Array} newTrades - Array of new trades to check
 * @returns {Array} Array of trades that don't exist yet
 */
export function filterDuplicateTrades(existingTrades, newTrades) {
    const existingOrderIds = new Set(
        existingTrades
        .filter(trade => trade.orderId)
        .map(trade => trade.orderId)
    );

    return newTrades.filter(trade =>
        !trade.orderId || !existingOrderIds.has(trade.orderId)
    );
}

/**
 * Get the latest trade date from an array of trades
 * @param {Array} trades - Array of trade objects
 * @returns {Date} Latest trade date or epoch if no trades
 */
export function getLatestTradeDate(trades) {
    return trades.reduce((latest, trade) => {
        const tradeDate = new Date(trade.entryDate);
        return latest > tradeDate ? latest : tradeDate;
    }, new Date(0));
}

/**
 * Generate a short GUID for account names
 * @returns {string} A short unique identifier
 */
export function generateShortGuid() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Create a default account name based on exchange type
 * @param {string} exchangeName - Name of the exchange
 * @returns {string} Generated account name
 */
export function generateAccountName(exchangeName) {
    return `${exchangeName} ${generateShortGuid()}`;
}

/**
 * Process trade import data from various sources
 * @param {Object} event - Event containing trade data
 * @returns {Array} Processed trade data array
 */
export function processTradeImportData(event) {
    let tradesData;

    if (event.detail && event.detail.trades) {
        tradesData = event.detail.trades;
    } else if (event.detail && event.detail.data && event.detail.data.trades) {
        tradesData = event.detail.data.trades;
    } else if (Array.isArray(event.detail)) {
        tradesData = event.detail;
    } else if (event.detail && Array.isArray(event.detail.data)) {
        tradesData = event.detail.data;
    } else {
        console.error('Received trade data:', event.detail);
        throw new Error('Invalid trades data structure');
    }

    if (!Array.isArray(tradesData) || tradesData.length === 0) {
        throw new Error('No trades found to import');
    }

    return tradesData;
}

// เพิ่มฟังก์ชัน syncTrades
export async function syncTrades(accountId, api) {
    try {
        console.group('Syncing trades...');
        console.time('Sync duration');

        // 1. ดึง account details
        const account = await api.getAccount(accountId);
        if (!account.apiKey || !account.secretKey) {
            throw new Error('API credentials not found');
        }

        // 2. ดึง trades ที่มีอยู่ในระบบ
        const existingTrades = await api.getTrades(accountId);
        const existingOrderIds = new Set(
            existingTrades
                .filter(trade => trade.orderId)
                .map(trade => String(trade.orderId).toLowerCase())
        );

        // 3. ดึง trades ใหม่จาก Binance
        const response = await api.fetchBinanceTradeHistory(account.apiKey, account.secretKey);
        if (!response.data.trades) {
            throw new Error('Failed to fetch new trades');
        }

        // Log วันที่และเวลาที่ใช้ในการเรียกข้อมูล
        /*console.log('Fetching trades from:', {
            startDate: new Date(response.data.startDate).toLocaleString(),
            endDate: new Date(response.data.endDate).toLocaleString(),
            days: Math.round((new Date(response.data.endDate) - new Date(response.data.startDate)) / (1000 * 60 * 60 * 24))
        });*/

        // Ensure all timestamps are properly converted to numbers
        if (response.data.trades && response.data.trades.length > 0) {
            response.data.trades.forEach(trade => {
                // Convert timestamps to numbers
                if (trade.entryDate) trade.entryDate = Number(trade.entryDate);
                if (trade.exitDate) trade.exitDate = Number(trade.exitDate);
                
                // Also convert timestamps in position history
                if (trade.positionHistory && trade.positionHistory.length > 0) {
                    trade.positionHistory.forEach(entry => {
                        if (entry.date) {
                            // If date is already ISO string, keep it, otherwise convert from timestamp
                            if (!entry.date.includes('T')) {
                                entry.date = new Date(Number(entry.date)).toISOString();
                            }
                        }
                        
                        // Add timestamp if not present
                        if (!entry.timestamp) {
                            entry.timestamp = new Date(entry.date).getTime();
                        }
                    });
                    
                    // Sort position history by timestamp
                    trade.positionHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                }
                
                // Ensure orders have proper timestamps
                if (trade.orders && trade.orders.length > 0) {
                    trade.orders.forEach(order => {
                        if (order.time) order.time = Number(order.time);
                        if (order.updateTime) order.updateTime = Number(order.updateTime);
                    });
                    
                    // Sort orders by time
                    trade.orders.sort((a, b) => a.time - b.time);
                }
                
                // Update exitDate based on the latest DECREASE action in positionHistory
                if (trade.status === 'CLOSED' && trade.positionHistory && trade.positionHistory.length > 0) {
                    const decreaseActions = trade.positionHistory.filter(entry => entry.action === 'DECREASE');
                    if (decreaseActions.length > 0) {
                        // Sort by timestamp to find the latest DECREASE
                        decreaseActions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                        const latestDecrease = decreaseActions[0];
                        if (latestDecrease && latestDecrease.timestamp) {
                            trade.exitDate = latestDecrease.timestamp;
                            //console.log(`Updated exit date for trade ${trade.orderId} to ${new Date(trade.exitDate).toLocaleString()} based on latest DECREASE action`);
                        }
                    }
                }
            });
        }

        // สำหรับดีบัก: แสดงจำนวน position history ของ trades ที่ได้จาก Binance
        /*console.log('Position history stats from Binance:', 
            response.data.trades.map(t => ({
                orderId: t.orderId || (t.orders && t.orders[0] ? t.orders[0].orderId : 'unknown'),
                status: t.status,
                hasPositionHistory: t.positionHistory ? true : false,
                positionHistoryCount: t.positionHistory ? t.positionHistory.length : 0
            }))
        );*/

        // 4. Filter out already imported trades
        const newTrades = response.data.trades.filter(trade => {
            const orderId = String(trade.orders?.[0]?.orderId || trade.orderId).toLowerCase();
            const existingTrade = existingTrades.find(t => String(t.orderId).toLowerCase() === orderId);
            
            if (existingTrade) {
                if (existingTrade.status === 'OPEN' && trade.status === 'CLOSED') {
                    // console.log(`Found open trade ${orderId} that needs to be closed`);
                    return true; // ให้ผ่านเพื่ออัพเดทเป็น closed
                }
                // console.log(`Duplicate trade found: ${orderId}`);
                return false;
            }
            return true;
        });

        // สำหรับดีบัก: แสดงข้อมูล position history ของ new trades ก่อน format
        /*console.log('Position history in new trades before formatting:', 
            newTrades.map(t => ({
                orderId: t.orderId || (t.orders && t.orders[0] ? t.orders[0].orderId : 'unknown'),
                status: t.status,
                hasPositionHistory: t.positionHistory ? true : false,
                positionHistoryCount: t.positionHistory ? t.positionHistory.length : 0
            }))
        );*/

        // 5. Format new trades
        const formattedTrades = formatTrades(
            newTrades,
            true,
            existingOrderIds,
            true,
            account.excludeZeroPnL
        );

        // สำหรับดีบัก: แสดงข้อมูล position history ของ trades หลัง format
        /*console.log('Position history in formatted trades:', 
            formattedTrades.map(t => ({
                orderId: t.orderId,
                status: t.status,
                positionHistoryCount: t.positionHistory ? t.positionHistory.length : 0
            }))
        );*/

        // 6. Update existing open positions
        const openTrades = existingTrades.filter(trade => trade.status === 'OPEN');
        let updatedFormattedTrades = [...formattedTrades]; // สร้างตัวแปรใหม่สำหรับ formattedTrades

        for (const openTrade of openTrades) {
            const closedTrade = response.data.trades.find(trade => 
                String(trade.orders?.[0]?.orderId || trade.orderId).toLowerCase() === 
                String(openTrade.orderId).toLowerCase()
            );

            if (closedTrade) {
                /*console.log(`Found matching trade for ${openTrade.orderId}:`, {
                    status: closedTrade.status,
                    entryDate: closedTrade.entryDate ? new Date(closedTrade.entryDate).toLocaleString() : 'N/A',
                    exitDate: closedTrade.exitDate ? new Date(closedTrade.exitDate).toLocaleString() : 'N/A'
                });*/
                
                // Check if this is a partial close or full close
                if (closedTrade.status === 'CLOSED') {
                    // console.log(`Updating open trade ${openTrade.orderId} with closed data`);
                    
                    // ตรวจสอบ position history
                    /*console.log('Position history from Binance:', 
                        closedTrade.positionHistory ? 
                        closedTrade.positionHistory.map(p => ({
                            date: p.date,
                            action: p.action,
                            quantity: p.quantity,
                            timestamp: p.timestamp
                        })) : 'None'
                    );*/
                    
                    // สร้าง position history ถ้าไม่มี
                    if (!closedTrade.positionHistory || closedTrade.positionHistory.length === 0) {
                        // console.log(`No position history found for closed trade ${openTrade.orderId}, creating default history`);
                        
                        // ถ้าไม่มี position history ให้สร้างประวัติพื้นฐานจากข้อมูลที่มีอยู่
                        const positionHistory = openTrade.positionHistory || [];
                        
                        // ถ้าไม่มีประวัติเลย ให้สร้างประวัติการเปิด position
                        if (positionHistory.length === 0) {
                            const entryTimestamp = Number(openTrade.entryDate);
                            positionHistory.push({
                                date: new Date(openTrade.entryDate).toISOString(),
                                quantity: Math.abs(openTrade.quantity),
                                percentage: 100,
                                price: openTrade.entryPrice,
                                pnl: 0,
                                orderId: openTrade.orderId,
                                action: 'INCREASE',
                                timestamp: entryTimestamp
                            });
                        }
                        
                        // เพิ่มประวัติการปิด position
                        const exitTimestamp = Number(closedTrade.exitDate || Date.now());
                        positionHistory.push({
                            date: new Date(exitTimestamp).toISOString(),
                            quantity: Math.abs(openTrade.quantity),
                            percentage: 100,
                            price: closedTrade.exitPrice,
                            pnl: closedTrade.pnl || 0,
                            orderId: openTrade.orderId,
                            action: 'DECREASE',
                            timestamp: exitTimestamp
                        });
                        
                        closedTrade.positionHistory = positionHistory;
                    }
                    
                    // Ensure we merge and preserve position history from both sources
                    const mergedPositionHistory = [...(openTrade.positionHistory || []), 
                                                  ...(closedTrade.positionHistory || [])].filter(Boolean);
                    
                    // Add timestamp to all entries if missing
                    mergedPositionHistory.forEach(entry => {
                        if (!entry.timestamp) {
                            entry.timestamp = new Date(entry.date).getTime();
                        }
                    });
                    
                    // เรียงลำดับตามวันที่
                    mergedPositionHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                    
                    // Remove duplicate entries based on date and action
                    const uniquePositionHistory = [];
                    const seenEntries = new Set();
                    
                    for (const entry of mergedPositionHistory) {
                        const key = `${entry.date}_${entry.action}_${entry.quantity}`;
                        if (!seenEntries.has(key)) {
                            seenEntries.add(key);
                            uniquePositionHistory.push(entry);
                        }
                    }
                    
                    /*console.log('Position history before merging:', {
                        existing: openTrade.positionHistory || [],
                        incoming: closedTrade.positionHistory || []
                    });*/
                    
                    // Find the latest DECREASE action to use as exit date
                    let exitDate = closedTrade.exitDate;
                    const decreaseActions = uniquePositionHistory.filter(entry => entry.action === 'DECREASE');
                    if (decreaseActions.length > 0) {
                        decreaseActions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                        const latestDecrease = decreaseActions[0];
                        if (latestDecrease && latestDecrease.timestamp) {
                            exitDate = latestDecrease.timestamp;
                            // console.log(`Using latest DECREASE timestamp as exit date: ${new Date(exitDate).toLocaleString()}`);
                        }
                    }
                    
                    const updatedTrade = {
                        ...openTrade,
                        ...closedTrade,
                        status: 'CLOSED',
                        confidenceLevel: Math.max(openTrade.confidenceLevel || 1, 1),
                        greedLevel: Math.max(openTrade.greedLevel || 1, 1),
                        tags: openTrade.tags,
                        notes: openTrade.notes,
                        exitDate: new Date(exitDate).toISOString(),
                        exitPrice: closedTrade.exitPrice,
                        pnl: closedTrade.pnl,
                        commission: openTrade.commission + closedTrade.commission,
                        positionHistory: uniquePositionHistory // Use deduplicated position history
                    };

                    // Debug updated trade object
                    /*console.log('Updated trade with positionHistory:', 
                        updatedTrade.positionHistory.map(p => ({
                            date: new Date(p.date).toLocaleString(),
                            action: p.action,
                            timestamp: p.timestamp ? new Date(p.timestamp).toLocaleString() : 'N/A'
                        }))
                    );*/

                    await api.updateTrade(openTrade._id, updatedTrade);
                    
                    // ลบ trade ที่เพิ่งอัพเดทออกจาก formattedTrades เพื่อป้องกันการสร้างซ้ำ
                    updatedFormattedTrades = updatedFormattedTrades.filter(t => 
                        t.orderId !== closedTrade.orderId
                    );
                } else if (closedTrade.status === 'OPEN') {
                    // Check if quantity has changed (partial close)
                    if (closedTrade.quantity !== openTrade.quantity) {
                        // If there was a change in quantity, it means a partial close happened
                        // console.log(`Updating partially closed position ${openTrade.orderId} from ${openTrade.quantity} to ${closedTrade.quantity}`);
                        
                        // The position is still open, just with a different quantity
                        // Check if closedTrade has positionHistory
                        if (!closedTrade.positionHistory || closedTrade.positionHistory.length === 0) {
                            // console.log(`No position history found for partially closed trade ${openTrade.orderId}, using existing history`);
                            closedTrade.positionHistory = openTrade.positionHistory || [];
                        }
                        
                        // Ensure we preserve position history
                        const mergedPositionHistory = [...(openTrade.positionHistory || []), 
                                                      ...(closedTrade.positionHistory || [])].filter(Boolean);
                        
                        // Add timestamp to all entries if missing
                        mergedPositionHistory.forEach(entry => {
                            if (!entry.timestamp) {
                                entry.timestamp = new Date(entry.date).getTime();
                            }
                        });
                        
                        // เรียงลำดับตามวันที่
                        mergedPositionHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                        
                        // Remove duplicate entries
                        const uniquePositionHistory = [];
                        const seenEntries = new Set();
                        
                        for (const entry of mergedPositionHistory) {
                            const key = `${entry.date}_${entry.action}_${entry.quantity}`;
                            if (!seenEntries.has(key)) {
                                seenEntries.add(key);
                                uniquePositionHistory.push(entry);
                            }
                        }
                        
                        /*console.log('Position history for partial close:', {
                            existing: openTrade.positionHistory || [],
                            incoming: closedTrade.positionHistory || []
                        });*/
                        
                        const updatedTrade = {
                            ...openTrade,
                            quantity: closedTrade.quantity,
                            amount: Math.abs(closedTrade.entryPrice * closedTrade.quantity),
                            entryPrice: closedTrade.entryPrice,
                            commission: closedTrade.commission,
                            confidenceLevel: Math.max(openTrade.confidenceLevel || 1, 1),
                            greedLevel: Math.max(openTrade.greedLevel || 1, 1),
                            // Update PnL from partial closes that may have occurred
                            pnl: closedTrade.pnl || openTrade.pnl || 0,
                            // Update position history if available
                            positionHistory: uniquePositionHistory
                        };

                        /*console.log('Updated partial close with positionHistory:', 
                            updatedTrade.positionHistory.map(p => ({
                                date: new Date(p.date).toLocaleString(),
                                action: p.action,
                                timestamp: p.timestamp ? new Date(p.timestamp).toLocaleString() : 'N/A'
                            }))
                        );*/

                        await api.updateTrade(openTrade._id, updatedTrade);
                        
                        // ลบ trade ที่เพิ่งอัพเดทออกจาก formattedTrades
                        updatedFormattedTrades = updatedFormattedTrades.filter(t => 
                            t.orderId !== closedTrade.orderId
                        );
                    }
                }
            }
        }

        // 7. บันทึก trades ใหม่
        // Filter out trades that might conflict with existing open positions
        const newTradesToSave = updatedFormattedTrades.filter(trade => 
            !openTrades.some(openTrade => 
                openTrade.symbol === trade.symbol &&
                openTrade.side === trade.side &&
                // Check if the entry dates are close (within 1 minute)
                Math.abs(new Date(openTrade.entryDate) - new Date(trade.entryDate)) < 60000
            )
        );

        // ตรวจสอบว่า newTradesToSave มี position history ครบทุกตัว
        newTradesToSave.forEach(trade => {
            if (!trade.positionHistory || trade.positionHistory.length === 0) {
                // console.log(`Creating default position history for new trade ${trade.orderId} with status ${trade.status}`);
                
                // สร้างประวัติการเปิด position
                const positionHistory = [];
                const entryTimestamp = Number(trade.entryDate);
                positionHistory.push({
                    date: new Date(trade.entryDate).toISOString(),
                    quantity: Math.abs(trade.quantity),
                    percentage: 100,
                    price: trade.entryPrice,
                    pnl: 0,
                    orderId: trade.orderId,
                    action: 'INCREASE',
                    timestamp: entryTimestamp
                });
                
                // ถ้าเป็น CLOSED trade ให้เพิ่มประวัติการปิด position
                if (trade.status === 'CLOSED' && trade.exitDate && trade.exitPrice) {
                    const exitTimestamp = Number(trade.exitDate);
                    positionHistory.push({
                        date: new Date(trade.exitDate).toISOString(),
                        quantity: Math.abs(trade.quantity),
                        percentage: 100,
                        price: trade.exitPrice,
                        pnl: trade.pnl || 0,
                        orderId: trade.orderId,
                        action: 'DECREASE',
                        timestamp: exitTimestamp
                    });
                }
                
                trade.positionHistory = positionHistory;
            } else {
                // Ensure all position history entries have timestamps
                trade.positionHistory.forEach(entry => {
                    if (!entry.timestamp) {
                        entry.timestamp = new Date(entry.date).getTime();
                    }
                });
                
                // Sort position history by timestamp
                trade.positionHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                
                // For CLOSED trades, ensure exitDate is based on the latest DECREASE action
                if (trade.status === 'CLOSED') {
                    const decreaseActions = trade.positionHistory.filter(entry => entry.action === 'DECREASE');
                    if (decreaseActions.length > 0) {
                        decreaseActions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                        const latestDecrease = decreaseActions[0];
                        if (latestDecrease && latestDecrease.timestamp) {
                            trade.exitDate = new Date(latestDecrease.timestamp).toISOString();
                            // console.log(`Updated exit date for new trade ${trade.orderId} to ${new Date(trade.exitDate).toLocaleString()} based on latest DECREASE action`);
                        }
                    }
                }
            }
        });

        // นับจำนวน trades ที่อัพเดทและสร้างใหม่
        const updatedTradesCount = openTrades.filter(openTrade => {
            const closedTrade = response.data.trades.find(trade => 
                String(trade.orders?.[0]?.orderId || trade.orderId).toLowerCase() === 
                String(openTrade.orderId).toLowerCase()
            );
            return closedTrade && closedTrade.status === 'CLOSED';
        }).length;

        const createdTradesCount = newTradesToSave.length;
        const totalTradesCount = updatedTradesCount + createdTradesCount;

        // Log new trades to be saved
        /*console.log(`Saving ${newTradesToSave.length} new trades with position history:`, 
            newTradesToSave.map(t => ({
                orderId: t.orderId,
                symbol: t.symbol,
                status: t.status,
                entryDate: new Date(t.entryDate).toLocaleString(),
                exitDate: t.exitDate ? new Date(t.exitDate).toLocaleString() : 'N/A',
                positionHistoryCount: t.positionHistory ? t.positionHistory.length : 0
            }))
        );*/

        // Save new trades in batches to avoid overwhelming the server
        const batchSize = 10;
        for (let i = 0; i < newTradesToSave.length; i += batchSize) {
            const batch = newTradesToSave.slice(i, i + batchSize);
            await Promise.all(batch.map(trade =>
                api.createTrade({
                    ...trade,
                    account: accountId
                })
            ));
            // console.log(`Saved batch ${i/batchSize + 1} of ${Math.ceil(newTradesToSave.length/batchSize)}`);
        }

        // Reload layout หลังจาก sync เสร็จสิ้น
        try {
            // console.log('Reloading layout after sync...');
            await layoutStore.loadLayouts();
        } catch (error) {
            // console.error('Error reloading layout:', error);
            // Fallback: Reload page if layout store fails
            // window.location.reload();
        }

        // console.timeEnd('Sync duration');
        // console.groupEnd();
        return {
            success: true,
            message: `Successfully synced ${totalTradesCount} trades (${updatedTradesCount} updated, ${createdTradesCount} new)`,
            type: 'success',
            newTradesCount: totalTradesCount,
            updatedTradesCount,
            createdTradesCount
        };

    } catch (err) {
        // console.error('Error in syncTrades:', err);
        // console.timeEnd('Sync duration');
        // console.groupEnd();
        return {
            success: false,
            message: err.message,
            type: 'error',
            error: err
        };
    }
}

// Add helper function to check if PnL is effectively zero
function isEffectivelyZeroPnL(pnl, amount) {
    if (pnl === 0) return true;

    // Convert to numbers and check for valid values
    pnl = Number(pnl);
    amount = Number(amount);

    if (!amount || amount === 0) return true;

    // Calculate PnL percentage
    const pnlPercentage = Math.abs(pnl / amount) * 100;
    // console.log(`PnL: ${pnl}, Amount: ${amount}, Percentage: ${pnlPercentage}%`);

    // Return true if PnL is less than 0.01%
    return pnlPercentage < 0.01;
}