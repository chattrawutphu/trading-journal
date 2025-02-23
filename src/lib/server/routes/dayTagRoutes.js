import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    getTags,
    createTag,
    deleteTag,
    incrementUsage,
    updateUsageCounts,
    getTaggedDays
} from '../controllers/dayTagController.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getTags)
    .post(createTag);

router.route('/:tagId')
    .delete(deleteTag);

router.post('/:tagId/increment', incrementUsage);
router.post('/update-usage', updateUsageCounts);
router.get('/:tag/days', getTaggedDays);

export default router; 