
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  createMatch,
  getMatches,
  getMatchDetail,
  createInnings,
  recordBall,
  setToss,
  completeMatch,
  updatePair,
  updateMatch,
  deleteMatch,
  startSuperOver,
  skipInnings,
} from '../controllers/matchController';

const router = Router();

router.get('/', getMatches);
router.get('/:id', getMatchDetail);

router.post('/:id/toss', authMiddleware, setToss); 
router.post('/', authMiddleware, createMatch);
router.patch('/:id', authMiddleware, updateMatch);
router.delete('/:id', authMiddleware, deleteMatch);
router.post('/:id/innings', authMiddleware, createInnings);
router.post('/:id/ball', authMiddleware, recordBall);
router.post("/:id/complete", authMiddleware, completeMatch);
router.post("/:id/updatePair", authMiddleware, updatePair);
router.post('/:id/super-over', authMiddleware, startSuperOver);
router.post('/:id/skip-innings', authMiddleware, skipInnings);

export default router;
