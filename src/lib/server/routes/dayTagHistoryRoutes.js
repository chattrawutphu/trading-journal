import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    getTagHistory,
    updateTagHistory,
    deleteTagHistory
} from '../controllers/dayTagHistoryController.js';

const router = express.Router();

router.use(protect);

router.route('/:tag')
    .get(getTagHistory)
    .put(updateTagHistory)
    .delete(deleteTagHistory);

export default router; 