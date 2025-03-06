import { json } from '@sveltejs/kit';
import Trade from '$lib/server/models/Trade.js';
import { ensureAuthenticated } from '$lib/server/middleware/auth.js';

export const GET = [
    ensureAuthenticated,
    async ({ params, url, locals }) => {
        try {
            const { accountId } = params;
            const userId = locals.user._id; // Get authenticated user
            
            // Build the query object from URL parameters
            const query = { 
                account: accountId,
            };
            
            // Apply symbol filter (case-insensitive partial match)
            const symbol = url.searchParams.get('symbol');
            if (symbol) {
                query.symbol = { $regex: symbol, $options: 'i' };
            }
            
            // Apply status filter
            const status = url.searchParams.get('status');
            if (status) {
                query.status = { $in: status.split(',') };
            }
            
            // Apply side filter
            const side = url.searchParams.get('side');
            if (side) {
                query.side = { $in: side.split(',') };
            }
            
            // Apply date range filter
            const dateStart = url.searchParams.get('dateStart');
            const dateEnd = url.searchParams.get('dateEnd');
            if (dateStart || dateEnd) {
                query.entryDate = {};
                if (dateStart) {
                    query.entryDate.$gte = new Date(dateStart);
                }
                if (dateEnd) {
                    // Set to end of day
                    const endDate = new Date(dateEnd);
                    endDate.setHours(23, 59, 59, 999);
                    query.entryDate.$lte = endDate;
                }
            }
            
            // Apply type filter
            const type = url.searchParams.get('type');
            if (type) {
                query.type = { $in: type.split(',') };
            }
            
            // Apply favorite filter
            const favorite = url.searchParams.get('favorite');
            if (favorite === 'true') {
                query.favorite = true;
            }
            
            // Apply tags filter (any of the specified tags)
            const tags = url.searchParams.get('tags');
            if (tags) {
                const tagList = tags.split(',');
                query.tags = { $in: tagList };
            }
            
            // Apply profitable/unprofitable filter
            const profitable = url.searchParams.get('profitable');
            const unprofitable = url.searchParams.get('unprofitable');
            if (profitable === 'true') {
                query.pnl = { $gt: 0 };
                query.status = 'CLOSED'; // Only closed trades can be profitable
            } else if (unprofitable === 'true') {
                query.pnl = { $lte: 0 };
                query.status = 'CLOSED'; // Only closed trades can be unprofitable
            }
            
            // Apply strategy filter
            const strategy = url.searchParams.get('strategy');
            if (strategy) {
                query.strategy = strategy;
            }
            
            // Apply emotions filter
            const emotions = url.searchParams.get('emotions');
            if (emotions) {
                query.emotions = { $in: emotions.split(',') };
            }
            
            // Apply confidence level filter
            const confidenceMin = url.searchParams.get('confidenceMin');
            const confidenceMax = url.searchParams.get('confidenceMax');
            if (confidenceMin || confidenceMax) {
                query.confidenceLevel = {};
                if (confidenceMin) {
                    query.confidenceLevel.$gte = parseInt(confidenceMin);
                }
                if (confidenceMax) {
                    query.confidenceLevel.$lte = parseInt(confidenceMax);
                }
            }
            
            // Apply greed level filter
            const greedMin = url.searchParams.get('greedMin');
            const greedMax = url.searchParams.get('greedMax');
            if (greedMin || greedMax) {
                query.greedLevel = {};
                if (greedMin) {
                    query.greedLevel.$gte = parseInt(greedMin);
                }
                if (greedMax) {
                    query.greedLevel.$lte = parseInt(greedMax);
                }
            }
            
            // Apply stop loss filter
            const hasStopLoss = url.searchParams.get('hasStopLoss');
            if (hasStopLoss !== null) {
                query.hasStopLoss = hasStopLoss === 'true';
            }
            
            // Apply take profit filter
            const hasTakeProfit = url.searchParams.get('hasTakeProfit');
            if (hasTakeProfit !== null) {
                query.hasTakeProfit = hasTakeProfit === 'true';
            }
            
            // Apply amount filter
            const amountMin = url.searchParams.get('amountMin');
            const amountMax = url.searchParams.get('amountMax');
            if (amountMin || amountMax) {
                query.amount = {};
                if (amountMin) {
                    query.amount.$gte = parseFloat(amountMin);
                }
                if (amountMax) {
                    query.amount.$lte = parseFloat(amountMax);
                }
            }
            
            // Apply PnL filter
            const pnlMin = url.searchParams.get('pnlMin');
            const pnlMax = url.searchParams.get('pnlMax');
            if (pnlMin || pnlMax) {
                query.pnl = query.pnl || {};
                if (pnlMin) {
                    query.pnl.$gte = parseFloat(pnlMin);
                }
                if (pnlMax) {
                    query.pnl.$lte = parseFloat(pnlMax);
                }
            }
            
            // Apply exclude zero PnL filter
            const excludeZeroPnL = url.searchParams.get('excludeZeroPnL');
            if (excludeZeroPnL === 'true') {
                query.pnl = query.pnl || {};
                query.pnl.$ne = 0;
            }
            
            // Apply disabled filter
            const disabled = url.searchParams.get('disabled');
            if (disabled !== null) {
                query.disabled = disabled === 'true';
            }
            
            // Apply position history filter
            const hasPositionHistory = url.searchParams.get('hasPositionHistory');
            if (hasPositionHistory === 'true') {
                query.positionHistory = { $exists: true, $not: { $size: 0 } };
            }
            
            console.log("Applying server filter with query:", JSON.stringify(query));
            
            // Execute the query
            const trades = await Trade.find(query).sort({ entryDate: -1 });
            
            console.log(`Found ${trades.length} trades matching filters`);
            return json(trades);
        } catch (error) {
            console.error('Error in trade filter endpoint:', error);
            return json({ message: error.message }, { status: 500 });
        }
    }
]; 