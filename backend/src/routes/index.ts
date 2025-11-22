
import { Router } from 'express';
import authRoutes from './auth';
import teamRoutes from './teams';
import playerRoutes from './players';
import seriesRoutes from './series';
import matchRoutes from './matches';
import statsRoutes from './stats';

const router = Router();

router.use('/auth', authRoutes);
router.use('/teams', teamRoutes);
router.use('/players', playerRoutes);
router.use('/series', seriesRoutes);
router.use('/matches', matchRoutes);
router.use('/stats', statsRoutes);

export default router;
