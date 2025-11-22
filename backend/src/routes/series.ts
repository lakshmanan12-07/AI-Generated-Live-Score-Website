
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createSeries, getSeries } from '../controllers/seriesController';

const router = Router();

router.get('/', getSeries);
router.post('/', authMiddleware, createSeries);

export default router;
