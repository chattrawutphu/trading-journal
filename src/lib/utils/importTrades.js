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
    console.log('Format trades options:', { isFromExchange, checkDuplicates, excludeZeroPnL });

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
                    console.log(`Duplicate found: ${orderId}`);
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

            // Skip PnL check for OPEN positions
            if (trade.status === 'OPEN') {
                return {
                    ...trade,
                    orderId: orderId,
                    amount: amount,
                    entryDate: new Date(trade.entryDate).toISOString(),
                    exitDate: trade.exitDate ? new Date(trade.exitDate).toISOString() : null
                };
            }

            // Log before checking PnL
            if (excludeZeroPnL) {
                console.log(`Checking PnL for trade ${orderId}:`, {
                    pnl: trade.pnl,
                    amount: amount,
                    isZero: isEffectivelyZeroPnL(trade.pnl, amount)
                });
            }

            // Skip trades with zero/negligible PnL
            if (excludeZeroPnL && isEffectivelyZeroPnL(trade.pnl, amount)) {
                console.log(`Skipping trade ${orderId} due to zero/negligible PnL`);
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
                confidenceLevel: trade.confidenceLevel || 5,
                greedLevel: trade.greedLevel || 5
            };

            // Log the trade details for debugging
            console.log('Formatted trade:', formattedTrade);

            return formattedTrade;
        } catch (error) {
            console.error(`Error formatting trade at index ${index}:`, error, trade);
            return null;
        }
    }).filter(trade => trade !== null);

    if (duplicates.size > 0) {
        console.log(`Found ${duplicates.size} duplicate trades`);
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
        console.log('Fetching trades from:', {
            startDate: new Date(response.data.startDate).toLocaleString(),
            endDate: new Date(response.data.endDate).toLocaleString(),
            days: Math.round((new Date(response.data.endDate) - new Date(response.data.startDate)) / (1000 * 60 * 60 * 24))
        });

        // 4. Filter out already imported trades
        const newTrades = response.data.trades.filter(trade => {
            const orderId = String(trade.orders?.[0]?.orderId || trade.orderId).toLowerCase();
            const existingTrade = existingTrades.find(t => String(t.orderId).toLowerCase() === orderId);
            
            if (existingTrade) {
                if (existingTrade.status === 'OPEN' && trade.status === 'CLOSED') {
                    console.log(`Found open trade ${orderId} that needs to be closed`);
                    return true; // ให้ผ่านเพื่ออัพเดทเป็น closed
                }
                console.log(`Duplicate trade found: ${orderId}`);
                return false;
            }
            return true;
        });

        // 5. Format new trades
        const formattedTrades = formatTrades(
            newTrades,
            true,
            existingOrderIds,
            true,
            account.excludeZeroPnL
        );

        // 6. Update existing open positions
        const openTrades = existingTrades.filter(trade => trade.status === 'OPEN');
        let updatedFormattedTrades = [...formattedTrades]; // สร้างตัวแปรใหม่สำหรับ formattedTrades

        for (const openTrade of openTrades) {
            const closedTrade = response.data.trades.find(trade => 
                String(trade.orders?.[0]?.orderId || trade.orderId).toLowerCase() === 
                String(openTrade.orderId).toLowerCase()
            );

            if (closedTrade) {
                console.log(`Found matching trade for ${openTrade.orderId}:`, closedTrade);
                
                if (closedTrade.status === 'CLOSED') {
                    console.log(`Updating open trade ${openTrade.orderId} with closed data`);
                    
                    const updatedTrade = {
                        ...openTrade,
                        ...closedTrade,
                        status: 'CLOSED',
                        confidenceLevel: openTrade.confidenceLevel,
                        greedLevel: openTrade.greedLevel,
                        tags: openTrade.tags,
                        notes: openTrade.notes,
                        exitDate: closedTrade.exitDate,
                        exitPrice: closedTrade.exitPrice,
                        pnl: closedTrade.pnl,
                        commission: openTrade.commission + closedTrade.commission
                    };

                    await api.updateTrade(openTrade._id, updatedTrade);
                    
                    // ลบ trade ที่เพิ่งอัพเดทออกจาก formattedTrades เพื่อป้องกันการสร้างซ้ำ
                    updatedFormattedTrades = updatedFormattedTrades.filter(t => 
                        t.orderId !== closedTrade.orderId
                    );
                } else if (closedTrade.status === 'OPEN' && closedTrade.quantity !== openTrade.quantity) {
                    // อัพเดท size position ถ้ามีการเปลี่ยนแปลง
                    console.log(`Updating position size for ${openTrade.orderId} from ${openTrade.quantity} to ${closedTrade.quantity}`);
                    
                    const updatedTrade = {
                        ...openTrade,
                        quantity: closedTrade.quantity,
                        amount: Math.abs(closedTrade.entryPrice * closedTrade.quantity),
                        entryPrice: closedTrade.entryPrice,
                        commission: closedTrade.commission
                    };

                    await api.updateTrade(openTrade._id, updatedTrade);
                    
                    // ลบ trade ที่เพิ่งอัพเดทออกจาก formattedTrades
                    updatedFormattedTrades = updatedFormattedTrades.filter(t => 
                        t.orderId !== closedTrade.orderId
                    );
                }
            }
        }

        // 7. บันทึก trades ใหม่
        const newTradesToSave = updatedFormattedTrades.filter(trade => 
            !openTrades.some(openTrade => 
                openTrade.symbol === trade.symbol &&
                openTrade.side === trade.side
            )
        );

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

        await Promise.all(newTradesToSave.map(trade =>
            api.createTrade({
                ...trade,
                account: accountId
            })
        ));

        // Reload layout หลังจาก sync เสร็จสิ้น
        try {
            console.log('Reloading layout after sync...');
            await layoutStore.loadLayouts();
        } catch (error) {
            console.error('Error reloading layout:', error);
            // Fallback: Reload page if layout store fails
            window.location.reload();
        }

        console.timeEnd('Sync duration');
        console.groupEnd();
        return {
            success: true,
            message: `Successfully synced ${totalTradesCount} trades (${updatedTradesCount} updated, ${createdTradesCount} new)`,
            type: 'success',
            newTradesCount: totalTradesCount,
            updatedTradesCount,
            createdTradesCount
        };

    } catch (err) {
        console.error('Error in syncTrades:', err);
        console.timeEnd('Sync duration');
        console.groupEnd();
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
    console.log(`PnL: ${pnl}, Amount: ${amount}, Percentage: ${pnlPercentage}%`);

    // Return true if PnL is less than 0.01%
    return pnlPercentage < 0.01;
}