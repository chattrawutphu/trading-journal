// Utility functions for importing trades

/**
 * Format trades from various sources into a consistent format
 * @param {Array} trades - Array of trade objects to format
 * @param {boolean} isFromExchange - Whether trades are from an exchange (affects orderId handling)
 * @param {Array} existingOrderIds - Array of existing orderIds to check for duplicates
 * @param {boolean} checkDuplicates - Whether to check for duplicates
 * @param {boolean} excludeZeroPnL - Whether to exclude trades with zero PnL
 * @returns {Array} Array of formatted trade objects
 */
export function formatTrades(trades, isFromExchange = true, existingOrderIds = [], checkDuplicates = false, excludeZeroPnL = false) {
    console.log('Format trades options:', { isFromExchange, checkDuplicates, excludeZeroPnL });

    // Remove unnecessary logs
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
            // ใช้ orderId จาก position แทน
            const orderId = trade.orders?.[0]?.orderId || trade.orderId;

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

            // Check duplicates only if checkDuplicates is true
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
                entryDate: new Date(trade.entryDate).toISOString(),
                exitDate: new Date(trade.exitDate).toISOString(),
                quantity: Math.abs(trade.quantity),
                amount: amount,
                entryPrice: trade.entryPrice,
                exitPrice: trade.exitPrice,
                pnl: trade.pnl || 0,
                commission: trade.commission || 0,
                commissionAsset: trade.commissionAsset || 'USDT',
                confidenceLevel: 5,
                greedLevel: 5
            };

            // Log the trade details for debugging
            console.log('Formatted trade:', formattedTrade);

            return formattedTrade;
        } catch (error) {
            console.error(`Error formatting trade at index ${index}:`, error, trade);
            return null;
        }
    }).filter(trade => trade !== null);

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

        // 3. ดึง trades ใหม่จาก Binance
        const response = await api.fetchBinanceTradeHistory(account.apiKey, account.secretKey);
        if (!response.data.trades) {
            throw new Error('Failed to fetch new trades');
        }

        // 4. Format และเช็ค duplicates
        const formattedTrades = formatTrades(
            response.data.trades,
            true,
            existingTrades.map(t => t.orderId),
            true,
            account.excludeZeroPnL // ใช้ค่าจาก account settings
        );
        console.log(`${formattedTrades.length} valid trades to import`);

        if (formattedTrades.length === 0) {
            console.timeEnd('Sync duration');
            console.groupEnd();
            return {
                success: true,
                message: 'No new trades found',
                type: 'info',
                newTradesCount: 0
            };
        }

        // 5. บันทึก trades ใหม่
        console.log('Saving new trades...');
        await Promise.all(formattedTrades.map(trade =>
            api.createTrade({
                ...trade,
                account: accountId
            })
        ));
        console.log('Trades saved successfully');

        console.timeEnd('Sync duration');
        console.groupEnd();
        return {
            success: true,
            message: `Successfully synced ${formattedTrades.length} new trades`,
            type: 'success',
            newTradesCount: formattedTrades.length
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