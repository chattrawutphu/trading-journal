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
import { binanceExchange } from '../../exchanges/binance.js';
import DayConfig from '../models/DayConfig.js';
import Account from '../models/Account.js';

const router = express.Router();

// Modify the test-connection route
router.post('/test-connection', async(req, res) => {
    try {
        const { type, apiKey, secretKey } = req.body;

        if (type === 'BINANCE_FUTURES') {
            const result = await binanceExchange.testConnection(apiKey, secretKey);
            res.json(result);
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

// ปรับปรุง route binance-history
router.post('/binance-history', async(req, res) => {
    try {
        const { apiKey, secretKey } = req.body;
        
        // Get days from environment variable
        const days = parseInt(process.env.BINANCE_FUTURES_ORDER_DAYS) || 7;
        const endTime = Date.now();
        const startTime = endTime - (days * 24 * 60 * 60 * 1000);

        // Log วันที่และเวลาที่ใช้ในการเรียกข้อมูล
        console.log('Fetching Binance history:', {
            startTime: new Date(startTime).toLocaleString(),
            endTime: new Date(endTime).toLocaleString(),
            days: days
        });

        // ดึงข้อมูล order history
        const orders = await binanceExchange.getFuturesOrderHistory(apiKey, secretKey, startTime, endTime);

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
        const positions = binanceExchange.processOrdersToPositions(orders);

        // สร้าง Map เพื่อเก็บ trade ID และ status ล่าสุด
        const tradeStatusMap = new Map();
        for (const order of orders) {
            const tradeId = `${order.symbol}_${order.positionSide}_${order.time}`;
            tradeStatusMap.set(tradeId, {
                status: order.status,
                updateTime: order.updateTime
            });
        }

        // อัพเดท positions ด้วยข้อมูล status ล่าสุด
        const updatedPositions = positions.map(pos => {
            if (pos.orders && pos.orders.length > 0) {
                const firstOrder = pos.orders[0];
                const tradeId = `${firstOrder.symbol}_${firstOrder.positionSide}_${firstOrder.time}`;
                const latestStatus = tradeStatusMap.get(tradeId);
                
                if (latestStatus) {
                    return {
                        ...pos,
                        status: latestStatus.status === 'FILLED' ? pos.status : 'OPEN',
                        lastUpdate: new Date(latestStatus.updateTime)
                    };
                }
            }
            return pos;
        });

        const symbols = [...new Set(updatedPositions.map(pos => pos.symbol))];
        const startDate = new Date(Math.min(...updatedPositions.map(pos => pos.entryDate))).toISOString();
        const endDate = new Date(Math.max(...updatedPositions.map(pos => pos.exitDate || Date.now()))).toISOString();

        res.json({
            success: true,
            data: {
                totalTrades: updatedPositions.length,
                symbols,
                startDate,
                endDate,
                trades: updatedPositions
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

// Day Config routes
router.get('/:accountId/day-configs/:date', async (req, res) => {
    try {
        const { accountId, date } = req.params;
        
        let config = await DayConfig.findOne({ 
            account: accountId,
            date: date
        });

        // ถ้าไม่มี config ให้สร้างใหม่
        if (!config) {
            config = {
                account: accountId,
                date: date,
                note: '',
                tags: [],
                favorite: false
            };
        }

        res.json(config);
    } catch (error) {
        console.error('Error getting day config:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post('/day-configs', async (req, res) => {
    try {
        const config = new DayConfig(req.body);
        await config.save();
        res.status(201).json(config);
    } catch (error) {
        console.error('Error creating day config:', error);
        res.status(400).json({ message: error.message });
    }
});

router.put('/:accountId/day-configs/:date', async (req, res) => {
    try {
        const { accountId, date } = req.params;
        const config = await DayConfig.findOneAndUpdate(
            { account: accountId, date: date },
            req.body,
            { new: true, upsert: true }
        );
        res.json(config);
    } catch (error) {
        console.error('Error updating day config:', error);
        res.status(400).json({ message: error.message });
    }
});

router.post('/:accountId/day-configs/:date/favorite', async (req, res) => {
    try {
        const { accountId, date } = req.params;
        const config = await DayConfig.findOne({ account: accountId, date: date });
        
        if (config) {
            config.favorite = !config.favorite;
            await config.save();
        } else {
            const newConfig = new DayConfig({
                account: accountId,
                date: date,
                favorite: true
            });
            await newConfig.save();
            return res.json(newConfig);
        }
        
        res.json(config);
    } catch (error) {
        console.error('Error toggling favorite:', error);
        res.status(400).json({ message: error.message });
    }
});

// Add DELETE endpoint for day configs
router.delete('/:accountId/day-configs/:date', async (req, res) => {
    try {
        const { accountId, date } = req.params;
  
        // Validate accountId belongs to user
        const account = await Account.findOne({ _id: accountId, user: req.user._id });
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }
  
        // Find the config with exact date string match
        const result = await DayConfig.findOneAndDelete({ 
            account: accountId,
            date: date
        });
  
        if (!result) {
            return res.status(404).json({ message: 'Day config not found' });
        }
  
        res.json({ message: 'Day config deleted successfully' });
    } catch (error) {
        console.error('Error deleting day config:', error);
        res.status(500).json({ message: 'Error deleting day config' });
    }
});

export default router;