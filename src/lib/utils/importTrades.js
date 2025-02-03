// Utility functions for importing trades

/**
 * Format trades from various sources into a consistent format
 * @param {Array} trades - Array of trade objects to format
 * @param {boolean} isFromExchange - Whether trades are from an exchange (affects orderId handling)
 * @param {Array} existingOrderIds - Array of existing orderIds to check for duplicates
 * @param {boolean} checkDuplicates - Whether to check for duplicates
 * @returns {Array} Array of formatted trade objects
 */
export function formatTrades(trades, isFromExchange = true, existingOrderIds = [], checkDuplicates = false) {
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
            // Basic validation
            if (!trade || typeof trade !== 'object') {
                console.error(`Trade at index ${index} is invalid:`, trade);
                return null;
            }

            // Validate and normalize orderId
            if (!trade.orderId) {
                console.error(`Missing orderId at index ${index}:`, trade);
                return null;
            }
            const orderId = String(trade.orderId).toLowerCase();

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

            // Convert and validate numeric values
            const price = Number(trade.price);
            const qty = Number(trade.qty);
            const timestamp = Number(trade.time);

            // Validate required numeric values
            if (!Number.isFinite(price) || price <= 0) {
                console.error(`Invalid price at index ${index}:`, trade.price);
                return null;
            }

            if (!Number.isFinite(qty) || qty === 0) {
                console.error(`Invalid quantity at index ${index}:`, trade.qty);
                return null;
            }

            if (!Number.isFinite(timestamp) || timestamp <= 0) {
                console.error(`Invalid timestamp at index ${index}:`, trade.time);
                return null;
            }

            // Calculate amount
            const amount = Math.abs(price * qty);
            if (!Number.isFinite(amount) || amount <= 0) {
                console.error(`Invalid amount calculation at index ${index}:`, amount);
                return null;
            }

            // Create formatted trade object
            const formattedTrade = {
                orderId: orderId,
                symbol: trade.symbol,
                side: trade.side === 'SELL' ? 'SHORT' : 'LONG',
                status: 'CLOSED',
                entryDate: new Date(timestamp).toISOString(),
                exitDate: new Date(timestamp).toISOString(),
                quantity: Math.abs(qty),
                amount: amount,
                entryPrice: price,
                exitPrice: price,
                confidenceLevel: 5,
                greedLevel: 5,
                pnl: Number(trade.realizedPnl) || 0
            };



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

        // 1. ดึง trades ที่มีอยู่ในระบบ
        console.log('Fetching existing trades...');
        const existingTrades = await api.getTrades(accountId);
        const existingIds = existingTrades.map(t => t.orderId);
        console.log(`Found ${existingIds.length} existing trades`);

        // 2. ดึง trades ใหม่จาก Binance
        console.log('Fetching account details...');
        const account = await api.getAccount(accountId);
        if (!account.apiKey || !account.secretKey) {
            throw new Error('API credentials not found');
        }

        console.log('Fetching new trades from Binance...');
        const response = await api.fetchBinanceTradeHistory(account.apiKey, account.secretKey);
        if (!response.data.trades) {
            throw new Error('Failed to fetch new trades');
        }

        const incomingIds = response.data.trades.map(t => t.orderId);
        console.log(`Found ${incomingIds.length} trades from Binance`);

        // หา trades ที่ซ้ำกัน
        const duplicateIds = incomingIds.filter(id => existingIds.includes(id));
        console.log(`Found ${duplicateIds.length} duplicate trades`);

        // 3. Format และเช็ค duplicates
        console.log('Formatting and validating trades...');
        const formattedTrades = formatTrades(response.data.trades, true, existingIds, true);
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