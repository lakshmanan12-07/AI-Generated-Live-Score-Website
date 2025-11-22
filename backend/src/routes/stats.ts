
import { Router } from 'express';
import { getBattingStats, getBowlingStats, getTeamStandings } from '../controllers/statsController';

const router = Router();

router.get('/batting', getBattingStats);
router.get('/bowling', getBowlingStats);
router.get('/teams', getTeamStandings);

export default router;
