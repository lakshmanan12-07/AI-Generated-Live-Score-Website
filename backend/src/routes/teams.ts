
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createTeam, getTeams, getTeamWithStats } from '../controllers/teamController';

const router = Router();

router.get('/', getTeams);
router.get('/:id', getTeamWithStats);
router.post('/', authMiddleware, createTeam);

export default router;
