import DayTag from '../models/DayTag.js';
import DayConfig from '../models/DayConfig.js';
import Account from '../models/Account.js';
import Trade from '../models/Trade.js';

const handleError = (res, error) => {
    console.error('Day Tag Error:', error);
    const statusCode = error.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        error: error.message || 'Internal server error'
    });
};

export const getTags = async(req, res) => {
    try {
        // ดึง tags ทั้งหมดของ user
        const tags = await DayTag.find({ user: req.user._id });
        
        // นับจำนวนการใช้งานของแต่ละ tag
        const tagsWithCount = await Promise.all(tags.map(async (tag) => {
            // นับจำนวน DayConfig ที่ใช้ tag นี้
            const count = await DayConfig.countDocuments({
                account: { $in: await getAccountIds(req.user._id) }, // ดึงเฉพาะ accounts ของ user นี้
                tags: tag.value
            });

            return {
                ...tag.toObject(),
                usageCount: count
            };
        }));

        // เรียงลำดับตาม usageCount จากมากไปน้อย
        const sortedTags = tagsWithCount.sort((a, b) => b.usageCount - a.usageCount);

        res.json(sortedTags);
    } catch (error) {
        handleError(res, error);
    }
};

// Helper function to get account IDs for a user
async function getAccountIds(userId) {
    const accounts = await Account.find({ user: userId }).select('_id');
    return accounts.map(acc => acc._id);
}

export const createTag = async(req, res) => {
    try {
        const { value } = req.body;

        // เพิ่ม logging เพื่อดูค่าที่ส่งมา
        // console.log('Received create tag request:', { body: req.body, value });

        if (!value || typeof value !== 'string') {
            res.status(400);
            throw new Error('Tag value is required and must be a string');
        }

        const trimmedValue = value.trim();
        if (!trimmedValue) {
            res.status(400);
            throw new Error('Tag value cannot be empty');
        }

        // Check if tag already exists for this user
        const existingTag = await DayTag.findOne({
            user: req.user._id,
            value: trimmedValue
        });

        if (existingTag) {
            return res.json(existingTag);
        }

        const tag = await DayTag.create({
            value: trimmedValue,
            user: req.user._id
        });

        res.status(201).json(tag);
    } catch (error) {
        handleError(res, error);
    }
};

export const deleteTag = async(req, res) => {
    try {
        const { tagId } = req.params;

        const tag = await DayTag.findOne({
            _id: tagId,
            user: req.user._id
        });

        if (!tag) {
            res.status(404);
            throw new Error('Tag not found');
        }

        await tag.deleteOne();
        res.json({ success: true, message: 'Tag deleted successfully' });
    } catch (error) {
        handleError(res, error);
    }
};

export const incrementUsage = async(req, res) => {
    try {
        const { tagId } = req.params;

        const tag = await DayTag.findOne({
            _id: tagId,
            user: req.user._id
        });

        if (!tag) {
            res.status(404);
            throw new Error('Tag not found');
        }

        tag.usageCount += 1;
        await tag.save();

        res.json(tag);
    } catch (error) {
        handleError(res, error);
    }
};

export const updateUsageCounts = async(req, res) => {
    try {
        const { tagIds } = req.body;
        
        if (!Array.isArray(tagIds)) {
            res.status(400);
            throw new Error('tagIds must be an array');
        }

        const updatedTags = await Promise.all(tagIds.map(async (tagId) => {
            const tag = await DayTag.findOne({
                _id: tagId,
                user: req.user._id
            });
            
            if (tag) {
                // นับจำนวน DayConfig ที่ใช้ tag นี้
                const count = await DayConfig.countDocuments({
                    account: { $in: await getAccountIds(req.user._id) },
                    tags: tag.value
                });
                
                tag.usageCount = count;
                await tag.save();
                return tag;
            }
            return null;
        }));

        res.json(updatedTags.filter(Boolean));
    } catch (error) {
        handleError(res, error);
    }
};

export const getTaggedDays = async(req, res) => {
    try {
        const { tag } = req.params;
        
        // ดึง DayConfigs ที่มี tag นี้
        const dayConfigs = await DayConfig.find({
            account: { $in: await getAccountIds(req.user._id) },
            tags: tag
        }).sort({ date: -1 });

        // ดึงข้อมูลเพิ่มเติมสำหรับแต่ละวัน
        const taggedDays = await Promise.all(dayConfigs.map(async (config) => {
            // แปลง date string เป็น Date object สำหรับการเปรียบเทียบ
            const startOfDay = new Date(config.date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(config.date);
            endOfDay.setHours(23, 59, 59, 999);
            
            const tradesCount = await Trade.countDocuments({
                account: config.account,
                $or: [
                    { 
                        entryDate: { 
                            $gte: startOfDay,
                            $lte: endOfDay
                        }
                    },
                    { 
                        exitDate: { 
                            $gte: startOfDay,
                            $lte: endOfDay
                        }
                    }
                ]
            });

            // ดึงข้อมูล trades ทั้งหมดของวันนี้
            const trades = await Trade.find({
                account: config.account,
                status: 'CLOSED',
                exitDate: { 
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            // คำนวณข้อมูลเพิ่มเติม
            const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
            const winCount = trades.filter(t => t.pnl > 0).length;
            const lossCount = trades.filter(t => t.pnl < 0).length;
            const winRate = trades.length > 0 ? (winCount / trades.length * 100).toFixed(1) : 0;
            
            // คำนวณ average trade
            const avgWin = winCount > 0 
                ? trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winCount 
                : 0;
            const avgLoss = lossCount > 0
                ? Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0)) / lossCount
                : 0;
            
            // คำนวณ largest win/loss
            const largestWin = trades.reduce((max, t) => t.pnl > max ? t.pnl : max, 0);
            const largestLoss = Math.abs(trades.reduce((min, t) => t.pnl < min ? t.pnl : min, 0));

            return {
                date: config.date,
                note: config.note,
                tradesCount,
                accountId: config.account,
                totalPnL,
                winCount,
                lossCount,
                winRate,
                avgWin,
                avgLoss,
                largestWin,
                largestLoss,
                openTrades: tradesCount - trades.length,
                closedTrades: trades.length
            };
        }));

        res.json(taggedDays);
    } catch (error) {
        handleError(res, error);
    }
}; 