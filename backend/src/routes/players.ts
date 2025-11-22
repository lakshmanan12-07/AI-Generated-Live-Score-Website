
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createPlayer, getPlayers, getPlayerWithStats, updatePlayer, deletePlayer } from '../controllers/playerController';

const router = Router();

router.get('/', getPlayers);
router.get('/:id', getPlayerWithStats);
router.post('/', authMiddleware, createPlayer);
router.patch('/:id', authMiddleware, updatePlayer);
router.delete('/:id', authMiddleware, deletePlayer);

export default router;
